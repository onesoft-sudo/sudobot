import { type Snowflake } from "discord.js";
import { PolicyModuleValidator, type PolicyModuleType } from "./PolicyModuleSchema";
import PolicyModuleError from "./PolicyModuleError";
import { Logger } from "@framework/log/Logger";
import { performance } from "perf_hooks";
import { readFile } from "fs/promises";
import { decode, encode, ExtensionCodec } from "@msgpack/msgpack";
import { writeFile } from "fs/promises";
import { AVCValidator, type AVCType } from "./AVCSchema";
import { LRUCache } from "lru-cache";

type CacheEntry = {
    avc: AVCType;
    modules: Map<string, PolicyModuleType>;
};

class PolicyManagerAVC {
    public static readonly POLICY_VERSION = 1;
    public static readonly extensionCodec = new ExtensionCodec();
    public static readonly messagePackOptions = { extensionCodec: this.extensionCodec, useBigInt64: true };

    static {
        const MAP_EXT_TYPE = 0;

        this.extensionCodec.register({
            type: MAP_EXT_TYPE,
            encode: (object: unknown): Uint8Array | null => {
                if (object instanceof Map) {
                    return encode([...object], this.messagePackOptions);
                }
                else {
                    return null;
                }
            },
            decode: (data: Uint8Array) => {
                const array = decode(data, this.messagePackOptions) as Array<[unknown, unknown]>;
                return new Map(array);
            }
        });
    }

    protected readonly cache = new LRUCache<Snowflake, CacheEntry>({
        max: 5000,
        ttl: 1000 * 60 * 30
    });

    protected readonly logger = Logger.getLogger(PolicyManagerAVC);

    public cacheGuild(guildId: Snowflake): CacheEntry {
        const cache = this.cache.get(guildId);

        if (cache) {
            return cache;
        }

        const newCache: CacheEntry = {
            modules: new Map(),
            avc: {
                allowTypes: [],
                allowTypesOnTargets: new Map(),
                denyTypes: [],
                denyTypesOnTargets: new Map(),
                avc_details: {
                    version: PolicyManagerAVC.POLICY_VERSION
                },
                mapTypeIds: new Map(),
                mapTypes: []
            }
        };

        this.cache.set(guildId, newCache);
        return newCache;
    }

    public loadModule(guildId: Snowflake, module: PolicyModuleType): void {
        const cache = this.cacheGuild(guildId);
        cache.modules.set(module.policy_module.name, module);
    }

    public async loadModuleFromFile(guildId: Snowflake, filepath: string): Promise<void> {
        const data = await readFile(filepath);

        try {
            const parsed = decode(data, PolicyManagerAVC.messagePackOptions);
            const final = PolicyModuleValidator.Parse(parsed);
            this.loadModule(guildId, final);
        }
        catch (error) {
            throw new PolicyModuleError("Invalid policy module file: " + filepath, { cause: error });
        }
    }

    public getLoadedModules(guildId: Snowflake): ReadonlyMap<string, PolicyModuleType> {
        const cache = this.cacheGuild(guildId);
        return cache.modules;
    }

    public getCurrentAVC(guildId: Snowflake) {
        return this.cacheGuild(guildId).avc;
    }

    public async storeAVC(guildId: Snowflake, filepath: string): Promise<void> {
        const avc = this.getCurrentAVC(guildId);
        const encoded = encode(avc, PolicyManagerAVC.messagePackOptions);
        await writeFile(filepath, encoded);
    }

    public async loadAVC(guildId: Snowflake, filepath: string): Promise<void> {
        const data = await readFile(filepath);

        try {
            const avc = AVCValidator.Parse(decode(data, PolicyManagerAVC.messagePackOptions));

            if (avc.avc_details.version > PolicyManagerAVC.POLICY_VERSION) {
                throw new PolicyModuleError("Unsupported policy version: " + avc.avc_details.version);
            }

            const cache = this.cacheGuild(guildId);

            cache.avc.mapTypes = avc.mapTypes;
            cache.avc.allowTypes = avc.allowTypes;
            cache.avc.denyTypes = avc.denyTypes;
            cache.avc.allowTypesOnTargets = avc.allowTypesOnTargets;
            cache.avc.denyTypesOnTargets = avc.denyTypesOnTargets;
            cache.avc.mapTypeIds = avc.mapTypeIds;
        }
        catch (error) {
            throw new PolicyModuleError("Invalid AVC cache file: " + filepath, { cause: error });
        }
    }

    public compileAll(guildId: Snowflake) {
        const start = performance.now();

        const mapTypes: string[] = [];
        const allowTypes: bigint[] = [];
        const denyTypes: bigint[] = [];

        const cache = this.cacheGuild(guildId);

        cache.avc.mapTypeIds.clear();
        cache.avc.allowTypesOnTargets.clear();
        cache.avc.denyTypesOnTargets.clear();

        for (const module of cache.modules.values()) {
            for (const typeId in module.map_types) {
                if (
                    mapTypes[typeId] &&
                    (module.map_types[typeId] !== mapTypes[typeId] ||
                        cache.avc.mapTypeIds.get(module.map_types[typeId]) !== +typeId)
                ) {
                    throw new PolicyModuleError(
                        `Conflicting type definitions in policy module: ${module.policy_module.name}: Existing '${mapTypes[typeId]}', new '${module.map_types[typeId]}' [@${typeId}]`
                    );
                }

                cache.avc.mapTypeIds.set(module.map_types[typeId], +typeId);
                mapTypes[typeId] = module.map_types[typeId];
                denyTypes[typeId] =
                    (denyTypes[typeId] ?? 0n) |
                    (typeof module.deny_types[typeId] === "bigint"
                        ? module.deny_types[typeId]
                        : module.deny_types[typeId]
                          ? BigInt(module.deny_types[typeId])
                          : 0n);
                allowTypes[typeId] =
                    ((allowTypes[typeId] ?? 0n) |
                        (typeof module.allow_types[typeId] === "bigint"
                            ? module.allow_types[typeId]
                            : module.allow_types[typeId]
                              ? BigInt(module.allow_types[typeId])
                              : 0n)) &
                    ~(denyTypes[typeId] ?? 0n);

                for (const targetTypeId in module.deny_types_on_targets[typeId]) {
                    const value = module.deny_types_on_targets[typeId][targetTypeId];
                    const key = (BigInt(typeId) << 32n) | BigInt(targetTypeId);
                    const existingValue = cache.avc.denyTypesOnTargets.get(key);
                    cache.avc.denyTypesOnTargets.set(
                        key,
                        (existingValue ?? 0n) |
                            denyTypes[typeId] |
                            (typeof value === "bigint" ? value : value ? BigInt(value) : 0n)
                    );
                }

                for (const targetTypeId in module.allow_types_on_targets[typeId]) {
                    const value = module.allow_types_on_targets[typeId][targetTypeId];
                    const key = (BigInt(typeId) << 32n) | BigInt(targetTypeId);
                    const existingValue = cache.avc.allowTypesOnTargets.get(key);
                    const existingDenyValue = cache.avc.denyTypesOnTargets.get(key);
                    cache.avc.allowTypesOnTargets.set(
                        key,
                        ((existingValue ?? 0n) |
                            ((allowTypes[typeId] ?? 0n) & ~(denyTypes[typeId] ?? 0n)) |
                            (typeof value === "bigint" ? value : value ? BigInt(value) : 0n)) &
                            ~(existingDenyValue ?? 0n)
                    );
                }
            }
        }

        cache.avc.mapTypes = mapTypes;
        cache.avc.allowTypes = allowTypes;
        cache.avc.denyTypes = denyTypes;

        const end = performance.now();
        const time = (end - start) / 1000;

        this.logger.debug(`AVC policy store compiled in ${time.toFixed(2)} seconds`);
    }

    public getPermissionsOf(guildId: Snowflake, type: string | number): bigint {
        const cache = this.cacheGuild(guildId);
        const typeId = typeof type === "string" ? cache.avc.mapTypeIds.get(type) : type;

        if (typeId === undefined) {
            return 0n;
        }

        return cache.avc.allowTypes[typeId] ?? 0n;
    }

    public getPermissionsOfWithTarget(guildId: Snowflake, type: string | number, targetType: string | number): bigint {
        const cache = this.cacheGuild(guildId);
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
}

export default PolicyManagerAVC;
