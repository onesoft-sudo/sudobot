/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { type GuildBasedChannel, GuildMember, Role, User, type Snowflake } from "discord.js";
import { PolicyModuleValidator, type PolicyModuleType } from "./PolicyModuleSchema";
import PolicyModuleError from "./PolicyModuleError";
import { Logger } from "@framework/log/Logger";
import { performance } from "perf_hooks";
import { readFile } from "fs/promises";
import { writeFile } from "fs/promises";
import { CacheValidator, type AVCType } from "./AVCSchema";
import { LRUCache } from "lru-cache";
import { systemPrefix } from "@main/utils/utils";
import path from "path";
import { createRegex, regexTest } from "@framework/utils/re2";
import MessagePackEncoder from "./MessagePackEncoder";

type CacheEntry = {
    avc: AVCType;
    modules: Map<string, PolicyModuleType>;
};

class PolicyManagerAVC {
    public static readonly POLICY_VERSION = 1;
    public static readonly AVC_CACHE_DIR = systemPrefix("cache/avc", true);
    protected readonly encoder = new MessagePackEncoder();

    protected readonly cache = new LRUCache<Snowflake, CacheEntry>({
        max: 2500,
        ttl: 1000 * 60 * 30
    });

    protected readonly logger = Logger.getLogger(PolicyManagerAVC);

    public async cacheGuild(guildId: Snowflake): Promise<CacheEntry> {
        const cache = this.cache.get(guildId);

        if (cache) {
            return cache;
        }

        try {
            const cache = await this.loadGuild(guildId);

            if (cache) {
                return cache;
            }
        }
        catch (error) {
            this.logger.error(error);
        }

        const newCache: CacheEntry = this.newCacheEntry();
        this.cache.set(guildId, newCache);
        return newCache;
    }

    private newCacheEntry(): CacheEntry {
        return {
            modules: new Map(),
            avc: {
                allowTypes: new Map(),
                allowTypesOnTargets: new Map(),
                denyTypes: new Map(),
                denyTypesOnTargets: new Map(),
                details: {
                    version: PolicyManagerAVC.POLICY_VERSION
                },
                mapTypeIds: new Map(),
                mapTypes: new Map(),
                entityContexts: new Map(),
                nextTypeId: 0,
                typeLabelPatterns: {
                    channels: [],
                    members: [],
                    roles: [],
                    memberPatterns: []
                }
            }
        };
    }

    public storeGuild(guildId: Snowflake) {
        return this.storeAVC(guildId, path.join(PolicyManagerAVC.AVC_CACHE_DIR, `${guildId}.avc`));
    }

    public loadGuild(guildId: Snowflake) {
        return this.loadAVC(guildId, path.join(PolicyManagerAVC.AVC_CACHE_DIR, `${guildId}.avc`));
    }

    public async loadModule(guildId: Snowflake, module: PolicyModuleType) {
        const cache = await this.cacheGuild(guildId);
        cache.modules.set(module.policy_module.name, module);
    }

    public async loadModuleFromFile(guildId: Snowflake, filepath: string): Promise<void> {
        const data = await readFile(filepath);

        try {
            const parsed = this.encoder.decode(data);
            const final = PolicyModuleValidator.Parse(parsed);
            await this.loadModule(guildId, final);
        }
        catch (error) {
            throw new PolicyModuleError("Invalid policy module file: " + filepath, { cause: error });
        }
    }

    public async getLoadedModules(guildId: Snowflake): Promise<ReadonlyMap<string, PolicyModuleType>> {
        const cache = await this.cacheGuild(guildId);
        return cache.modules;
    }

    public async getCurrentAVC(guildId: Snowflake) {
        return (await this.cacheGuild(guildId)).avc;
    }

    public async storeAVC(guildId: Snowflake, filepath: string): Promise<void> {
        const cache = this.cache.get(guildId) ?? this.newCacheEntry();
        const encoded = this.encoder.encode(cache);
        await writeFile(filepath, encoded);
    }

    public async loadAVC(guildId: Snowflake, filepath: string): Promise<CacheEntry> {
        const data = await readFile(filepath);

        try {
            const { avc, modules } = CacheValidator.Parse(this.encoder.decode(data));

            if (avc.details.version > PolicyManagerAVC.POLICY_VERSION) {
                throw new PolicyModuleError("Unsupported policy version: " + avc.details.version);
            }

            this.cache.set(guildId, {
                modules,
                avc
            });

            return {
                modules,
                avc
            };
        }
        catch (error) {
            throw new PolicyModuleError("Invalid AVC cache file: " + filepath, { cause: error });
        }
    }

    public async buildStore(guildId: Snowflake) {
        const start = performance.now();
        const cache = await this.cacheGuild(guildId);

        cache.avc.mapTypeIds.clear();
        cache.avc.allowTypesOnTargets.clear();
        cache.avc.denyTypesOnTargets.clear();
        cache.avc.mapTypes.clear();
        cache.avc.allowTypes.clear();
        cache.avc.denyTypes.clear();

        for (const module of cache.modules.values()) {
            for (let mapTypeIndex = 0; mapTypeIndex < module.map_types.length; mapTypeIndex++) {
                const mapTypeString = module.map_types[mapTypeIndex];
                const typeId = cache.avc.mapTypeIds.get(mapTypeString) ?? cache.avc.nextTypeId++;
                const existingMapTypeId = cache.avc.mapTypeIds.get(mapTypeString);

                if (existingMapTypeId !== undefined && cache.avc.mapTypes.get(existingMapTypeId) !== mapTypeString) {
                    throw new PolicyModuleError(
                        `Conflicting type definitions in policy module: ${module.policy_module.name}: Existing '${cache.avc.mapTypes.get(existingMapTypeId)}', new '${mapTypeString}' [@${existingMapTypeId}]`
                    );
                }

                cache.avc.mapTypeIds.set(mapTypeString, typeId);
                cache.avc.mapTypes.set(typeId, mapTypeString);

                const localExistingDenyTypeValue = cache.avc.denyTypes.get(typeId) ?? 0n;
                const localExistingAllowTypeValue = cache.avc.allowTypes.get(typeId) ?? 0n;
                const localDenyTypeValue = localExistingDenyTypeValue | BigInt(module.deny_types[mapTypeIndex] || 0);
                const localAllowTypeValue =
                    (localExistingAllowTypeValue | BigInt(module.allow_types[mapTypeIndex] || 0)) & ~localDenyTypeValue;

                cache.avc.denyTypes.set(typeId, localDenyTypeValue);
                cache.avc.allowTypes.set(typeId, localAllowTypeValue);
            }

            for (const sourceMapTypeIndexString in module.deny_types_on_targets) {
                const sourceMapTypeString = module.map_types[sourceMapTypeIndexString];
                const sourceTypeId = cache.avc.mapTypeIds.get(sourceMapTypeString);

                if (sourceTypeId === undefined) {
                    throw new PolicyModuleError(`Invalid source type index: ${sourceMapTypeIndexString}`);
                }

                for (const targetMapTypeIndexString in module.deny_types_on_targets[sourceMapTypeIndexString]) {
                    const targetMapTypeString = module.map_types[targetMapTypeIndexString];
                    const targetTypeId = cache.avc.mapTypeIds.get(targetMapTypeString);

                    if (targetTypeId === undefined) {
                        throw new PolicyModuleError(`Invalid target type index: ${targetMapTypeIndexString}`);
                    }

                    const targetDenyTypeValue =
                        module.deny_types_on_targets[sourceMapTypeIndexString]?.[targetMapTypeIndexString] ?? 0n;
                    const key = (BigInt(sourceTypeId) << 32n) | BigInt(targetTypeId);
                    const existingTargetDenyTypeValue = cache.avc.denyTypesOnTargets.get(key);
                    const localExistingDenyTypeValue = cache.avc.denyTypes.get(sourceTypeId) ?? 0n;

                    cache.avc.denyTypesOnTargets.set(
                        key,
                        (existingTargetDenyTypeValue ?? 0n) |
                            (localExistingDenyTypeValue ?? 0n) |
                            BigInt(targetDenyTypeValue)
                    );
                }
            }

            for (const sourceMapTypeIndexString in module.allow_types_on_targets) {
                const sourceMapTypeString = module.map_types[sourceMapTypeIndexString];
                const sourceTypeId = cache.avc.mapTypeIds.get(sourceMapTypeString);

                if (sourceTypeId === undefined) {
                    throw new PolicyModuleError(`Invalid source type index: ${sourceMapTypeIndexString}`);
                }

                for (const targetMapTypeIndexString in module.allow_types_on_targets[sourceMapTypeIndexString]) {
                    const targetMapTypeString = module.map_types[targetMapTypeIndexString];
                    const targetTypeId = cache.avc.mapTypeIds.get(targetMapTypeString);

                    if (targetTypeId === undefined) {
                        throw new PolicyModuleError(`Invalid target type index: ${targetMapTypeIndexString}`);
                    }

                    const targetAllowTypeValue =
                        module.allow_types_on_targets[sourceMapTypeIndexString]?.[targetMapTypeIndexString] ?? 0n;
                    const key = (BigInt(sourceTypeId) << 32n) | BigInt(targetTypeId);
                    const existingTargetAllowTypeValue = cache.avc.allowTypesOnTargets.get(key) ?? 0n;
                    const localExistingAllowTypeValue = cache.avc.allowTypes.get(sourceTypeId) ?? 0n;
                    const existingTargetDenyTypeValue = cache.avc.denyTypesOnTargets.get(key) ?? 0n;
                    const localExistingDenyTypeValue = cache.avc.denyTypes.get(sourceTypeId) ?? 0n;

                    cache.avc.allowTypesOnTargets.set(
                        key,
                        ((existingTargetAllowTypeValue ?? 0n) |
                            localExistingAllowTypeValue |
                            BigInt(targetAllowTypeValue)) &
                            ~(existingTargetDenyTypeValue | localExistingDenyTypeValue)
                    );
                }
            }

            if (module.type_labeling?.commonPatterns?.length) {
                for (const pattern of module.type_labeling.commonPatterns) {
                    const key = `${pattern.entity_type}s` as const;
                    cache.avc.typeLabelPatterns[key].push(pattern);
                }
            }

            if (module.type_labeling?.memberPatterns?.length) {
                cache.avc.typeLabelPatterns.memberPatterns.push(...module.type_labeling.memberPatterns);
            }
        }

        const end = performance.now();
        const time = (end - start) / 1000;

        this.logger.debug(`AVC policy store compiled in ${time.toFixed(2)} seconds`);
    }

    public async getPermissionsOf(guildId: Snowflake, type: string | number): Promise<bigint> {
        const cache = await this.cacheGuild(guildId);
        const typeId = typeof type === "string" ? cache.avc.mapTypeIds.get(type) : type;

        if (typeId === undefined) {
            return 0n;
        }

        return cache.avc.allowTypes.get(typeId) ?? 0n;
    }

    public async getPermissionsOfWithTarget(
        guildId: Snowflake,
        type: string | number,
        targetType: string | number
    ): Promise<bigint> {
        const cache = await this.cacheGuild(guildId);
        const typeId = typeof type === "string" ? cache.avc.mapTypeIds.get(type) : type;

        if (typeId === undefined) {
            return 0n;
        }

        const targetTypeId = typeof targetType === "string" ? cache.avc.mapTypeIds.get(targetType) : targetType;

        if (targetTypeId === undefined) {
            return 0n;
        }

        return cache.avc.allowTypesOnTargets.get((BigInt(typeId) << 32n) | BigInt(targetTypeId)) ?? 0n;
    }

    public async relabelEntities(guildId: Snowflake, entities: Iterable<GuildMember | GuildBasedChannel | Role>) {
        const cache = await this.cacheGuild(guildId);
        let count = 0;

        for (const entity of entities) {
            const type = entity instanceof GuildMember ? "members" : entity instanceof Role ? "roles" : "channels";
            const typePrefix = this.getTypePrefixOf(entity);
            const patterns = cache.avc.typeLabelPatterns[type];

            for (const { entity_attr, pattern, context } of patterns) {
                let value: string | undefined = undefined;

                switch (entity_attr) {
                    case "id":
                        value = entity.id;
                        break;

                    case "topic":
                        if ("topic" in entity && type === "channels") {
                            value = entity.topic as string;
                        }

                        break;

                    case "parent_id":
                        if ("parentId" in entity && type === "channels") {
                            value = entity.parentId ?? "";
                        }

                        break;

                    case "name":
                        if ("name" in entity) {
                            value = entity.name;
                        }
                        else if ("nickname" in entity && entity.nickname) {
                            value = entity.nickname;
                        }
                        else if ("displayName" in entity && entity.displayName) {
                            value = entity.displayName;
                        }
                        else if ("user" in entity) {
                            value = entity.user.username;
                        }

                        break;

                    case "username":
                        if ("user" in entity) {
                            value = entity.user.username;
                        }

                        break;

                    case "nickname":
                        if ("nickname" in entity && entity.nickname) {
                            value = entity.nickname;
                        }

                        break;

                    default:
                        continue;
                }

                if (value === undefined) {
                    continue;
                }

                const regex = createRegex(pattern[0], pattern[1]);

                if (!regexTest(regex, value)) {
                    continue;
                }

                cache.avc.entityContexts.set(`${typePrefix}:${entity.id}`, context);
                count++;
            }

            if (entity instanceof GuildMember) {
                for (const { context, excludedRoles, requiredRoles } of cache.avc.typeLabelPatterns.memberPatterns) {
                    if (excludedRoles?.length && excludedRoles.every(r => entity.roles.cache.has(r))) {
                        continue;
                    }

                    if (requiredRoles?.length && !requiredRoles.every(r => entity.roles.cache.has(r))) {
                        continue;
                    }

                    if (!excludedRoles?.length && !requiredRoles?.length) {
                        continue;
                    }

                    cache.avc.entityContexts.set(`${typePrefix}:${entity.id}`, context);
                    count++;
                }
            }
        }

        return count;
    }

    public getTypePrefixOf(entity: GuildMember | GuildBasedChannel | Role) {
        return entity instanceof User ? "u" : entity instanceof GuildMember ? "m" : entity instanceof Role ? "r" : "c";
    }

    public async getContextOf(guildId: Snowflake, entity: GuildMember | GuildBasedChannel | Role) {
        const cache = await this.cacheGuild(guildId);
        return cache.avc.entityContexts.get(`${this.getTypePrefixOf(entity)}:${entity.id}`) ?? 0;
    }
}

export default PolicyManagerAVC;
