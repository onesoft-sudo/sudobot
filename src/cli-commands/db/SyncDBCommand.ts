/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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

import { readdir } from "fs/promises";
import path from "path";
import { exit } from "process";
import DiscordClient from "../../client/Client";
import BaseCLICommand from "../../utils/structures/BaseCLICommand";

export default class SyncDBCommand extends BaseCLICommand {
    constructor() {
        super('syncdb', 'guild');
    }

    async run(client: DiscordClient, argv: string[], args: string[]) {
        const files = await readdir(path.join(__dirname, '/../../models'));

        for await (const file of files) {
            if (file === '..' || file === '.')
                continue;
            
            const { default: model } = await import(path.join(__dirname, '/../../models', file));
            await model.sync({
                logging: console.log
            });
        }

        exit(0);
    }
}