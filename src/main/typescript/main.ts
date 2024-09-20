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

import "dotenv/config";
import "module-alias/register";
import "reflect-metadata";

import Application from "@framework/app/Application";
import { version } from "@root/package.json";
import path from "path";
import DiscordKernel from "./core/DiscordKernel";

async function main() {
    Application.setupGlobals();

    const rootDirectoryPath = path.resolve(__dirname);
    const projectRootDirectoryPath = path.resolve(__dirname, "../../..");
    const application = new Application(
        rootDirectoryPath,
        projectRootDirectoryPath,
        process.env.SUDOBOT_VERSION ?? version
    );

    await application.run(new DiscordKernel());
}

export default main();
