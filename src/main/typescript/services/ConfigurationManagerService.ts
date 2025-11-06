import { Logger } from "@framework/log/Logger";
import FileSystem from "@framework/polyfills/FileSystem";
import Service from "@framework/services/Service";
import { isSnowflake } from "@framework/utils/utils";
import {
    GuildConfigurationDefaultValue,
    GuildConfigurationSchemaValidator,
    type GuildConfigurationType
} from "@schemas/GuildConfigurationSchema";
import { SystemConfigurationSchemaValidator, type SystemConfigurationType } from "@schemas/SystemConfigurationSchema";
import { systemPrefix } from "@main/utils/utils";
import type { Awaitable, Snowflake } from "discord.js";
import { readdir } from "fs/promises";
import { LRUCache } from "lru-cache";

export const SERVICE_CONFIGURATION_MANAGER = "configurationManagerService";

class ConfigurationManagerService extends Service {
    public override readonly name: string = SERVICE_CONFIGURATION_MANAGER;

    public static readonly CONFIG_GUILD_DIR = systemPrefix("config/guilds", true);
    public static readonly CONFIG_SYSTEM_FILE = systemPrefix("config/system.json");

    private readonly logger = Logger.getLogger(ConfigurationManagerService);
    private readonly cache = new LRUCache<Snowflake, GuildConfigurationType>({
        max: 5000,
        ttl: 1000 * 60 * 60
    });
    private readonly syncGuilds = new Set<string>();
    private _timeout?: ReturnType<typeof setTimeout>;
    public systemConfig: SystemConfigurationType = { system_admins: [] };

    public async reloadAll(): Promise<void> {
        const guildConfigFiles = await readdir(ConfigurationManagerService.CONFIG_GUILD_DIR);

        for (const guildConfigFile of guildConfigFiles) {
            if (!guildConfigFile.endsWith(".json")) {
                continue;
            }

            const guildId = guildConfigFile.replace(/\.json$/, "");

            if (!isSnowflake(guildId)) {
                continue;
            }

            await this.reload(guildId);
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
        } catch (error) {
            this.logger.error("Validation error for system configuration: ", error);
        }
    }

    public async reload(guildId?: string): Promise<GuildConfigurationType | undefined> {
        if (!guildId) {
            await this.reloadAll();
            return;
        }

        this.logger.info("Reloading configuration for guild: ", guildId);

        const configJSON = await FileSystem.readFileContents(
            `${ConfigurationManagerService.CONFIG_GUILD_DIR}/${guildId}.json`,
            { json: true }
        );

        try {
            const config = GuildConfigurationSchemaValidator.Parse(configJSON);
            this.cache.set(guildId, config);
            return config;
        } catch (error) {
            this.logger.error("Validation error for guild: ", guildId, error);
        }
    }

    public async get(guildId: Snowflake): Promise<Readonly<GuildConfigurationType>> {
        const cachedConfig = this.cache.get(guildId);

        if (cachedConfig !== undefined) {
            return cachedConfig;
        }

        try {
            const config = await this.reload(guildId);

            if (!config) {
                return GuildConfigurationDefaultValue;
            }

            return config;
        } catch (error) {
            this.logger.debug(error);
        }

        return GuildConfigurationDefaultValue;
    }

    public async set(
        guildId: Snowflake,
        setter: (config: GuildConfigurationType) => Awaitable<void | GuildConfigurationType>
    ): Promise<void> {
        let cachedConfig = this.cache.get(guildId);
        let set = false;

        if (cachedConfig === undefined) {
            try {
                const config = await this.reload(guildId);

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
            this.cache.set(guildId, newConfig ?? cachedConfig);
        }

        this.queueSync(guildId);
    }

    public queueSync(...guildIds: string[]) {
        for (const guildId of guildIds) {
            this.syncGuilds.add(guildId);
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
        const guilds = [...this.syncGuilds.values()];
        this.syncGuilds.clear();

        for (const guildId of guilds) {
            if (guildId === "system") {
                this.logger.info("Writing guild configuration to disk");

                await FileSystem.writeFileContents(
                    ConfigurationManagerService.CONFIG_SYSTEM_FILE,
                    JSON.stringify(this.systemConfig, null, 4)
                );

                continue;
            }

            const config = this.cache.get(guildId);

            if (!config) {
                this.logger.warn("Configuration changes lost for guild: ", guildId);
                continue;
            }

            this.logger.info("Writing configuration to disk for guild: ", guildId);

            await FileSystem.writeFileContents(
                `${ConfigurationManagerService.CONFIG_GUILD_DIR}/${guildId}.json`,
                JSON.stringify(config, null, 4)
            );
        }
    }

    public override async boot(): Promise<void> {
        await this.reloadSystem();
    }
}

export default ConfigurationManagerService;
