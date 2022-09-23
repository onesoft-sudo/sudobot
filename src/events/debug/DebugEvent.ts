
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

import { exec } from "child_process";
import { format } from "date-fns";
import { appendFile } from "fs/promises";
import path from "path";
import DiscordClient from "../../client/Client";
import { LogLevel } from "../../services/DebugLogger";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class DebugEvent extends BaseEvent {
    logFile: string = path.join(process.env.SUDO_PREFIX ?? (__dirname + "/../../../"), "logs", 'debug.log');

    constructor() {
        super("debug");
        appendFile(this.logFile, `\n\n[${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}] [STARTUP] The system has started.\n`);
    }

    async run(client: DiscordClient, e: string): Promise <void> {
        if (e.includes("Provided token") || e.includes(process.env.TOKEN!) || e.includes("[READY] Session ")) {
            console.log('DEBUG: [One hidden log]');
            return;
        }

        console.log("DEBUG: ", e);
        await appendFile(this.logFile, `[${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}] [LOG] ${e}\n`);

        if (process.env.PLATFORM === 'replit' && e.includes("Hit a 429") && !client.isReady()) {
            console.log("DEBUG: ", "Restart Required");
            await appendFile(this.logFile, `[${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}] [LOG] ${e}\n`);
            await appendFile(this.logFile, `[${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}] [FATAL] Restart Required\n`);
            await client.debugLogger.logToHomeServer("Discord Ratelimit [429]: System restart required.\nAutomated restart is in progress.", LogLevel.WARN);

            exec("kill 1");
            return;
        }
    }
}
