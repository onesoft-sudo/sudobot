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

import fs, { writeFile } from "fs/promises";
import { z } from "zod";
import Service from "../core/Service";
import { GuildConfigSchema } from "../types/GuildConfigSchema";
import { SystemConfig, SystemConfigSchema } from "../types/SystemConfigSchema";
import { log, logInfo } from "../utils/logger";
import { sudoPrefix } from "../utils/utils";

export * from "../types/GuildConfigSchema";

export const name = "configManager";

export const GuildConfigContainerSchema = z.record(z.string(), GuildConfigSchema.optional().or(z.undefined()));
export type GuildConfigContainer = z.infer<typeof GuildConfigContainerSchema>;

export default class ConfigManager extends Service {
    public readonly configPath = sudoPrefix("config/config.json");
    public readonly systemConfigPath = sudoPrefix("config/system.json");
    protected configSchemaPath = "";

    config: GuildConfigContainer = {} as GuildConfigContainer;
    systemConfig: SystemConfig = {} as SystemConfig;

    async boot() {
        await this.load();
    }

    async load() {
        log(`Loading system configuration from file: ${this.systemConfigPath}`);
        const systemConfigFileContents = await fs.readFile(this.systemConfigPath, { encoding: "utf-8" });

        log(`Loading guild configuration from file: ${this.configPath}`);
        const configFileContents = await fs.readFile(this.configPath, { encoding: "utf-8" });

        const configJSON = JSON.parse(configFileContents);

        if ("$schema" in configJSON) {
            this.configSchemaPath = configJSON.$schema;
            delete configJSON.$schema;
        }

        this.config = GuildConfigContainerSchema.parse(configJSON);
        this.systemConfig = SystemConfigSchema.parse(JSON.parse(systemConfigFileContents));
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
                this.config[id] = GuildConfigSchema.parse({});
            }
        }
    }

    async write({ guild = true, system = false } = {}) {
        if (guild) {
            log(`Writing guild configuration to file: ${this.configPath}`);

            const json = JSON.stringify(
                {
                    $schema: this.configSchemaPath,
                    ...this.config
                },
                null,
                4
            );

            await writeFile(this.configPath, json, { encoding: "utf-8" });
        }

        if (system) {
            log(`Writing system configuration to file: ${this.systemConfigPath}`);

            const json = JSON.stringify(this.systemConfig, null, 4);
            await writeFile(this.systemConfigPath, json, { encoding: "utf-8" });
        }

        logInfo("Successfully wrote the configuration files");
    }
}
