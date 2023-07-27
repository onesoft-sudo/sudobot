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
import path from "path";
import { z } from "zod";
import Service from "../core/Service";
import { GuildConfigSchema } from "../types/GuildConfigSchema";
import { SystemConfig, SystemConfigSchema } from "../types/SystemConfigSchema";

export * from "../types/GuildConfigSchema";

export const name = "configManager";

export const GuildConfigContainerSchema = z.record(z.string(), GuildConfigSchema.optional().or(z.undefined()));
export type GuildConfigContainer = z.infer<typeof GuildConfigContainerSchema>;

export default class ConfigManager extends Service {
    protected configPath = path.resolve(__dirname, "../../config/config.json");
    protected systemConfigPath = path.resolve(__dirname, "../../config/system.json");
    protected configSchemaPath = "";

    config: GuildConfigContainer = {} as GuildConfigContainer;
    systemConfig: SystemConfig = {} as SystemConfig;

    async boot() {
        const configFileBuffer = await fs.readFile(this.configPath);
        const systemConfigFileBuffer = await fs.readFile(this.systemConfigPath);
        const configJSON = JSON.parse(configFileBuffer.toString());

        if ("$schema" in configJSON) {
            this.configSchemaPath = configJSON.$schema;
            delete configJSON.$schema;
        }

        this.config = GuildConfigContainerSchema.parse(configJSON);
        this.systemConfig = SystemConfigSchema.parse(JSON.parse(systemConfigFileBuffer.toString()));
    }

    async write() {
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
}
