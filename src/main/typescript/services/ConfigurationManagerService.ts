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

import { Logger } from "@framework/log/Logger";
import FileSystem from "@framework/polyfills/FileSystem";
import Service from "@framework/services/Service";
import { isSnowflake } from "@framework/utils/utils";
import {
    GuildConfigurationDefaultValue,
    GuildConfigurationSchemaValidator,
    type GuildConfigurationType
} from "@schemas/GuildConfigurationSchema";
import {
    SystemConfigurationDefaultValue,
    SystemConfigurationSchemaValidator,
    type SystemConfigurationType
} from "@schemas/SystemConfigurationSchema";
import { systemPrefix } from "@main/utils/utils";
import type { Awaitable, Snowflake } from "discord.js";
import { readdir } from "fs/promises";
import { LRUCache } from "lru-cache";

export const SERVICE_CONFIGURATION_MANAGER = "configurationManagerService";

export enum ConfigurationType {
    DirectMessage = "d",
    Guild = "g"
}

class ConfigurationManagerService extends Service {
    public override readonly name: string = SERVICE_CONFIGURATION_MANAGER;

    public static readonly CONFIG_BY_ID_DIR = systemPrefix("config/by-id", true);
    public static readonly CONFIG_SYSTEM_FILE = systemPrefix("config/system.json");

    private readonly logger = Logger.getLogger(ConfigurationManagerService);
    private readonly cache = new LRUCache<`${ConfigurationType}::${Snowflake}`, GuildConfigurationType>({
        max: 5000,
        ttl: 1000 * 60 * 60
    });
    private readonly syncFiles = new Set<`${ConfigurationType}::${Snowflake}` | "system">();
    private _timeout?: ReturnType<typeof setTimeout>;
    public systemConfig: SystemConfigurationType = structuredClone(SystemConfigurationDefaultValue);

    public async reloadAll(): Promise<void> {
        const guildConfigFiles = await readdir(ConfigurationManagerService.CONFIG_BY_ID_DIR);

        for (const guildConfigFile of guildConfigFiles) {
            if (!guildConfigFile.endsWith(".json")) {
                continue;
            }

            const [type, id] = guildConfigFile.replace(/\.json$/, "").split("_");

            if ((type !== "d" && type !== "g") || !isSnowflake(id)) {
                continue;
            }

            await this.reload(type as ConfigurationType, id);
        }
    }

    public async reloadSystem(): Promise<void> {
        this.logger.info("Reloading system-wide configuration");

        const configJSON = await FileSystem.readFileContents(ConfigurationManagerService.CONFIG_SYSTEM_FILE, {
            json: true
        });

        try {
            const config = SystemConfigurationSchemaValidator.Parse(configJSON);
            this.systemConfig = config;
        }
        catch (error) {
            this.logger.error("Validation error for system configuration: ", error);
        }
    }

    public async reload(type?: ConfigurationType, id?: string): Promise<GuildConfigurationType | undefined> {
        if (!type || !id) {
            await this.reloadAll();
            return;
        }

        this.logger.info("Reloading configuration for: ", type, id);

        const configJSON = await FileSystem.readFileContents(
            `${ConfigurationManagerService.CONFIG_BY_ID_DIR}/${type}_${id}.json`,
            { json: true }
        );

        try {
            const config = GuildConfigurationSchemaValidator.Parse(configJSON);
            this.cache.set(`${type}::${id}`, config);
            return config;
        }
        catch (error) {
            this.logger.error("Validation error for: ", type, id, error);
        }
    }

    public async get(type: ConfigurationType, id: Snowflake): Promise<Readonly<GuildConfigurationType>> {
        const cachedConfig = this.cache.get(`${type}::${id}`);

        if (cachedConfig !== undefined) {
            return cachedConfig;
        }

        try {
            const config = await this.reload(type, id);

            if (!config) {
                return GuildConfigurationDefaultValue;
            }

            return config;
        }
        catch (error) {
            this.logger.debug(error);
            this.cache.set(`${type}::${id}`, structuredClone(GuildConfigurationDefaultValue));
        }

        return GuildConfigurationDefaultValue;
    }

    public async set(
        type: ConfigurationType,
        id: Snowflake,
        setter: (config: GuildConfigurationType) => Awaitable<void | GuildConfigurationType>
    ): Promise<void> {
        let cachedConfig = this.cache.get(`${type}::${id}`);
        let set = false;

        if (cachedConfig === undefined) {
            try {
                const config = await this.reload(type, id);

                if (config) {
                    cachedConfig = config;
                }
            } catch (error) {
                this.logger.debug(error);
            }

            if (cachedConfig === undefined) {
                cachedConfig = structuredClone(GuildConfigurationDefaultValue);
                set = true;
            }
        }

        const newConfig = await setter(cachedConfig);

        if (set || newConfig !== cachedConfig) {
            this.cache.set(`${type}::${id}`, newConfig ?? cachedConfig);
        }

        this.queueSync(`${type}::${id}`);
    }

    public queueSync(...guildIds: `${ConfigurationType}::${Snowflake}`[]) {
        for (const guildId of guildIds) {
            this.syncFiles.add(guildId);
        }

        if (!this._timeout) {
            this._timeout = setTimeout(() => {
                this.sync()
                    .then(() => (this._timeout = undefined))
                    .catch(this.logger.error);
            }, 15_000);
        }
    }

    public async sync() {
        const fileNames = [...this.syncFiles.values()];
        this.syncFiles.clear();

        for (const fileName of fileNames) {
            if (fileName === "system") {
                this.logger.info("Writing system configuration to disk");

                await FileSystem.writeFileContents(
                    ConfigurationManagerService.CONFIG_SYSTEM_FILE,
                    JSON.stringify(this.systemConfig, null, 4)
                );

                continue;
            }

            const config = this.cache.get(fileName);

            if (!config) {
                this.logger.warn("Configuration changes lost for: ", fileName);
                continue;
            }

            this.logger.info("Writing configuration to disk for: ", fileName);

            await FileSystem.writeFileContents(
                `${ConfigurationManagerService.CONFIG_BY_ID_DIR}/${fileName}.json`,
                JSON.stringify(config, null, 4)
            );
        }
    }

    public override async boot(): Promise<void> {
        await this.reloadSystem();
    }
}

export default ConfigurationManagerService;
