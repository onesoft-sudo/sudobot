/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { ConfigurationManagerServiceInterface } from "@framework/contracts/ConfigurationManagerServiceInterface";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { zodToJsonSchema } from "@framework/utils/zod";
import {
    ExtensionMetadataSchema,
    type Extension
} from "@main/extensions/Extension";
import { Snowflake } from "discord.js";
import fs, { writeFile } from "fs/promises";
import JSON5 from "json5";
import path from "path";
import { z, ZodObject } from "zod";
import { GuildConfig, GuildConfigSchema } from "../schemas/GuildConfigSchema";
import {
    SystemConfig,
    SystemConfigSchema
} from "../schemas/SystemConfigSchema";
import { systemPrefix } from "../utils/utils";

export const name = "configManager";

export type GuildConfigContainer = {
    [key: string]: GuildConfig | undefined;
};

@Name("configManager")
export default class ConfigurationManager
    extends Service
    implements ConfigurationManagerServiceInterface
{
    public readonly configPath = systemPrefix("config/config.json");
    public readonly systemConfigPath = systemPrefix("config/system.json");
    public readonly schemaDirectory = systemPrefix("config/schema", true);
    public readonly configSchemaPath = path.join(
        this.schemaDirectory,
        "config.json"
    );
    public readonly systemConfigSchemaPath = path.join(
        this.schemaDirectory,
        "system.json"
    );
    public readonly extensionMetaSchemaPath = path.join(
        this.schemaDirectory,
        "extension.json"
    );

    protected configSchemaInfo =
        "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/config/schema/config.json";
    protected systemConfigSchemaInfo =
        "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/config/schema/system.json";
    protected loaded = false;
    protected guildConfigSchema = GuildConfigSchema;
    protected systemConfigSchema = SystemConfigSchema;
    protected guildConfigContainerSchema = this.guildConfigContainer();

    public config: GuildConfigContainer = {} as GuildConfigContainer;
    public systemConfig: SystemConfig = {} as SystemConfig;

    /**
     * This service is manually booted by the Extension Service.
     */
    public async manualBoot() {
        await this.loadOnce();
    }

    private guildConfigContainer() {
        return z.record(z.string(), this.guildConfigSchema.optional());
    }

    public loadOnce() {
        if (this.loaded) {
            return;
        }

        this.loaded = true;
        return this.load();
    }

    public async load() {
        this.application.logger.debug(
            `Loading system configuration from file: ${this.systemConfigPath}`
        );
        const systemConfigFileContents = await fs.readFile(
            this.systemConfigPath,
            {
                encoding: "utf-8"
            }
        );

        this.application.logger.debug(
            `Loading guild configuration from file: ${this.configPath}`
        );
        const configFileContents = await fs.readFile(this.configPath, {
            encoding: "utf-8"
        });

        const configJSON = JSON5.parse(configFileContents);
        const systemConfigJSON = JSON5.parse(systemConfigFileContents);

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
        this.application.logger.info(
            "Successfully loaded the configuration files"
        );
    }

    public onReady() {
        const guildIds = this.application.getClient().guilds.cache.keys();

        if (!process.env.PRIVATE_BOT_MODE) {
            for (const id of guildIds) {
                if (id in this.config) {
                    continue;
                }

                this.application.logger.info(
                    `Auto configuring default settings for guild: ${id}`
                );
                this.autoConfigure(id);
            }
        }

        if (!process.env.NO_GENERATE_CONFIG_SCHEMA) {
            this.application.logger.info(
                "Generating configuration schema files"
            );
            this.generateSchema().catch(this.application.logger.error);
        }
    }

    public autoConfigure(id: Snowflake) {
        this.config[id] = this.guildConfigSchema.parse({});
    }

    public testConfig() {
        const guildResult = this.guildConfigContainerSchema.safeParse(
            this.config
        );

        if (!guildResult.success) {
            return { error: guildResult.error, type: "guild" as const };
        }

        const systemResult = this.systemConfigSchema.safeParse(
            this.systemConfig
        );

        if (!systemResult.success) {
            return { error: systemResult.error, type: "system" as const };
        }

        return null;
    }

    public async write({ guild = true, system = true } = {}) {
        if (guild) {
            this.application.logger.debug(
                `Writing guild configuration to file: ${this.configPath}`
            );

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
            this.application.logger.debug(
                `Writing system configuration to file: ${this.systemConfigPath}`
            );

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

        this.application.logger.info(
            "Successfully wrote the configuration files"
        );
    }

    public get<T extends GuildConfig = GuildConfig>(
        guildId: Snowflake
    ): T | undefined {
        return this.config[guildId] as T | undefined;
    }

    public getOrDefault<T extends GuildConfig = GuildConfig>(
        guildId: Snowflake
    ): T {
        return (this.config[guildId] as T) ?? this.guildConfigSchema.parse({});
    }

    public set(guildId: Snowflake, value: GuildConfig) {
        this.config[guildId] = value;
    }

    public async registerExtensionConfig(extensions: Extension[]) {
        if (extensions.length === 0) {
            return;
        }

        this.application.logger.debug(
            "Registering extension configuration schemas"
        );

        let finalGuildConfigSchema: ZodObject = this.guildConfigSchema;
        let finalSystemConfigSchema: ZodObject = this.systemConfigSchema;

        for (const extension of extensions) {
            const guildConfigSchema = await extension.guildConfig();
            const systemConfigSchema = await extension.systemConfig();

            if (guildConfigSchema) {
                finalGuildConfigSchema =
                    finalGuildConfigSchema.extend(guildConfigSchema);
            }

            if (systemConfigSchema) {
                finalSystemConfigSchema =
                    finalSystemConfigSchema.extend(systemConfigSchema);
            }
        }

        this.systemConfigSchema =
            finalSystemConfigSchema as typeof this.systemConfigSchema;
        this.guildConfigSchema =
            finalGuildConfigSchema as typeof this.guildConfigSchema;
        this.guildConfigContainerSchema = this.guildConfigContainer();
    }

    public async generateSchema() {
        const configSchema = JSON.stringify(
            zodToJsonSchema(this.guildConfigContainerSchema),
            null,
            4
        );
        await writeFile(this.configSchemaPath, configSchema, {
            encoding: "utf-8"
        });
        this.application.logger.info(
            "Successfully generated the guild configuration schema file"
        );

        const systemConfigSchema = JSON.stringify(
            zodToJsonSchema(this.systemConfigSchema),
            null,
            4
        );
        await writeFile(this.systemConfigSchemaPath, systemConfigSchema, {
            encoding: "utf-8"
        });
        this.application.logger.info(
            "Successfully generated the system configuration schema file"
        );

        const extensionMetaSchema = JSON.stringify(
            zodToJsonSchema(ExtensionMetadataSchema),
            null,
            4
        );
        await writeFile(this.extensionMetaSchemaPath, extensionMetaSchema, {
            encoding: "utf-8"
        });
        this.application.logger.info(
            "Successfully generated the extension metadata schema file"
        );
    }
}
