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

import { zodToJsonSchema } from "zod-to-json-schema";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { GuildConfigContainerSchema } from "../src/services/ConfigManager";

(async () => {
    const SCHEMA_DIR = path.join(__dirname, "../config/schema");
    const GUILD_CONFIG_SCHEMA_FILE = path.join(SCHEMA_DIR, "config.json");
    const SYSTEM_CONFIG_SCHEMA_FILE = path.join(SCHEMA_DIR, "system.json");

    console.log("Generating schemas...");

    const schema = zodToJsonSchema(GuildConfigContainerSchema);

    if (!existsSync(SCHEMA_DIR)) {
        await fs.mkdir(SCHEMA_DIR);
    }

    await fs.writeFile(GUILD_CONFIG_SCHEMA_FILE, JSON.stringify(schema, null, 4));
})();