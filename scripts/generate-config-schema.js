#!/usr/bin/env node

/*
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

const { existsSync } = require("fs");
const fs = require("fs/promises");
const path = require("path");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");

require("../build/core/Client");
const { GuildConfigSchema } = require("../build/services/ConfigManager");
const { SystemConfigSchema } = require("../build/types/SystemConfigSchema");

(async () => {
    const SCHEMA_DIR = path.join(__dirname, "../config/schema");
    const GUILD_CONFIG_SCHEMA_FILE = path.join(SCHEMA_DIR, "config.json");
    const SYSTEM_CONFIG_SCHEMA_FILE = path.join(SCHEMA_DIR, "system.json");

    console.info("Generating schemas...");

    const guildConfigSchema = zodToJsonSchema(z.record(z.string(), GuildConfigSchema.or(z.string())));
    const systemConfigSchema = zodToJsonSchema(SystemConfigSchema);

    console.info("Writing schemas...");

    if (!existsSync(SCHEMA_DIR)) {
        await fs.mkdir(SCHEMA_DIR);
    }

    await fs.writeFile(GUILD_CONFIG_SCHEMA_FILE, JSON.stringify(guildConfigSchema, null, 4));
    await fs.writeFile(SYSTEM_CONFIG_SCHEMA_FILE, JSON.stringify(systemConfigSchema, null, 4));
})();
