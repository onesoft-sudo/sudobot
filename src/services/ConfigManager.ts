/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { Snowflake } from "discord.js";
import fs, { writeFile } from "fs/promises";
import path from "path";
import { AnyZodObject, z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Extension } from "../core/Extension";
import Service from "../core/Service";
import { GuildConfig, GuildConfigSchema } from "../types/GuildConfigSchema";
import { SystemConfig, SystemConfigSchema } from "../types/SystemConfigSchema";
import { log, logDebug, logInfo } from "../utils/Logger";
import { sudoPrefix } from "../utils/utils";

export * from "../types/GuildConfigSchema";

export const name = "configManager";

export type GuildConfigContainer = {
    [key: string]: GuildConfig | undefined;
};

export default class ConfigManager extends Service {
    public readonly configPath = sudoPrefix("config/config.json");
    public readonly systemConfigPath = sudoPrefix("config/system.json");
    public readonly schemaDirectory = sudoPrefix("config/schema", true);
    public readonly configSchemaPath = path.join(this.schemaDirectory, "config.json");
    public readonly systemConfigSchemaPath = path.join(this.schemaDirectory, "system.json");

    protected configSchemaInfo =
        "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/config/schema/config.json";
    protected systemConfigSchemaInfo =
        "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/config/schema/system.json";
    protected loaded = false;
    protected guildConfigSchema = GuildConfigSchema;
    protected systemConfigSchema = SystemConfigSchema;
    protected guildConfigContainerSchema = this.guildConfigContainer();

    config: GuildConfigContainer = {} as GuildConfigContainer;
    systemConfig: SystemConfig = {} as SystemConfig;

    /**
     * This service is manually booted by the Extension Service.
     */
    async manualBoot() {
        await this.loadOnce();
    }

    private guildConfigContainer() {
        return z.record(z.string(), this.guildConfigSchema.optional().or(z.undefined()));
    }

    loadOnce() {
        if (this.loaded) {
            return;
        }

        this.loaded = true;
        return this.load();
    }

    async load() {
        log(`Loading system configuration from file: ${this.systemConfigPath}`);
        const systemConfigFileContents = await fs.readFile(this.systemConfigPath, {
            encoding: "utf-8"
        });

        log(`Loading guild configuration from file: ${this.configPath}`);
        const configFileContents = await fs.readFile(this.configPath, { encoding: "utf-8" });

        const configJSON = JSON.parse(configFileContents);
        const systemConfigJSON = JSON.parse(systemConfigFileContents);

        if ("$schema" in configJSON) {
            this.configSchemaInfo = configJSON.$schema;
            delete configJSON.$schema;
        }

        if ("$schema" in systemConfigJSON) {
            this.systemConfigSchemaInfo = systemConfigJSON.$schema;
            delete systemConfigJSON.$schema;
        }

        this.config = this.guildConfigContainerSchema.parse(configJSON);
        this.systemConfig = this.systemConfigSchema.parse(systemConfigJSON);
        logInfo("Successfully loaded the configuration files");
    }

    onReady() {
        const guildIds = this.client.guilds.cache.keys();

        if (!process.env.PRIVATE_BOT_MODE) {
            for (const id of guildIds) {
                if (id in this.config) {
                    continue;
                }

                logInfo(`Auto configuring default settings for guild: ${id}`);
                this.autoConfigure(id);
            }
        }

        if (!process.env.NO_GENERATE_CONFIG_SCHEMA) {
            this.client.logger.info("Generating configuration schema files");
            this.generateSchema();
        }
    }

    autoConfigure(id: Snowflake) {
        this.config[id] = this.guildConfigSchema.parse({});
    }

    testConfig() {
        const guildResult = this.guildConfigContainerSchema.safeParse(this.config);

        if (!guildResult.success) {
            return { error: guildResult.error, type: "guild" as const };
        }

        const systemResult = this.systemConfigSchema.safeParse(this.systemConfig);

        if (!systemResult.success) {
            return { error: systemResult.error, type: "system" as const };
        }

        return null;
    }

    async write({ guild = true, system = true } = {}) {
        if (guild) {
            log(`Writing guild configuration to file: ${this.configPath}`);

            const json = JSON.stringify(
                {
                    $schema: this.configSchemaInfo,
                    ...this.config
                },
                null,
                4
            );

            await writeFile(this.configPath, json, { encoding: "utf-8" });
        }

        if (system) {
            log(`Writing system configuration to file: ${this.systemConfigPath}`);

            const json = JSON.stringify(
                {
                    $schema: this.systemConfigSchemaInfo,
                    ...this.systemConfig
                },
                null,
                4
            );

            await writeFile(this.systemConfigPath, json, { encoding: "utf-8" });
        }

        logInfo("Successfully wrote the configuration files");
    }

    get<T extends GuildConfig = GuildConfig>(guildId: Snowflake): T | undefined {
        return this.config[guildId] as T | undefined;
    }

    set(guildId: Snowflake, value: GuildConfig) {
        this.config[guildId] = value;
    }

    async registerExtensionConfig(extensions: Extension[]) {
        if (extensions.length === 0) {
            return;
        }

        logDebug("Registering extension configuration schemas");

        let finalGuildConfigSchema: AnyZodObject = this.guildConfigSchema;
        let finalSystemConfigSchema: AnyZodObject = this.systemConfigSchema;

        for (const extension of extensions) {
            const guildConfigSchema = await extension.guildConfig();
            const systemConfigSchema = await extension.systemConfig();

            if (guildConfigSchema) {
                finalGuildConfigSchema = finalGuildConfigSchema.extend(guildConfigSchema);
            }

            if (systemConfigSchema) {
                finalSystemConfigSchema = finalSystemConfigSchema.extend(systemConfigSchema);
            }
        }

        this.systemConfigSchema = finalSystemConfigSchema as typeof this.systemConfigSchema;
        this.guildConfigSchema = finalGuildConfigSchema as typeof this.guildConfigSchema;
        this.guildConfigContainerSchema = this.guildConfigContainer();
    }

    async generateSchema() {
        const configSchema = JSON.stringify(
            zodToJsonSchema(this.guildConfigContainerSchema),
            null,
            4
        );
        await writeFile(this.configSchemaPath, configSchema, { encoding: "utf-8" });
        logInfo("Successfully generated the guild configuration schema file");

        const systemConfigSchema = JSON.stringify(
            zodToJsonSchema(this.systemConfigSchema),
            null,
            4
        );
        await writeFile(this.systemConfigSchemaPath, systemConfigSchema, { encoding: "utf-8" });
        logInfo("Successfully generated the system configuration schema file");
    }
}
