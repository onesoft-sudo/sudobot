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

import { MessageEmbed, WebhookClient } from "discord.js";
import { appendFile } from "fs/promises";
import path from "path";
import Service from "../utils/structures/Service";
import { splitMessage } from "../utils/util";

export enum LogLevel {
    LOG = 'log',
    INFO = 'info',
    WARN = 'warn',
    CRITICAL = 'critical',
    ERROR = 'error'
}

export default class DebugLogger extends Service {
    private joinLeaveLogFile = path.join(process.env.SUDO_PREFIX ?? (__dirname + '/../../'), 'logs/join-leave.log');
    private appLogFile = path.join(process.env.SUDO_PREFIX ?? (__dirname + '/../../'), 'logs/app.log');
    
    async logApp(level: LogLevel, message: string) {
        await this.log(this.appLogFile, level, message);
    }

    async logLeaveJoin(level: LogLevel, message: string) {
        await this.log(this.joinLeaveLogFile, level, message);
    }

    async log(stream: string, level: LogLevel, message: string) {
        await appendFile(stream, `[${new Date().toISOString()}] [${level}] ${message}\n`);
    }

    async logToHomeServer(message: string, logLevel: LogLevel = LogLevel.ERROR) {
        if (!process.env.DEBUG_WEKHOOK_URL)
            return;
        
        const webhookClient = new WebhookClient({ url: process.env.DEBUG_WEKHOOK_URL! });
        const splitted = splitMessage(message);
        const embed = new MessageEmbed({
            color: logLevel === LogLevel.WARN ? 'GOLD' : 0xf14a60, 
            title: logLevel === LogLevel.WARN ? 'Core Warning' : 'Fatal Error',
            description: splitted.shift(),
        });

        if (splitted.length === 0) {
            embed.setTimestamp();
        }

        try {
            await webhookClient.send({
                embeds: [
                    embed
                ]
            });

            for (const index in splitted) {
                const embed = new MessageEmbed({
                    color: logLevel === LogLevel.WARN ? 'GOLD' : 0xf14a60, 
                    description: splitted[index],
                });

                if (parseInt(index) === (splitted.length - 1)) {
                    embed.setTimestamp();
                }

                await webhookClient.send({
                    embeds: [
                        embed
                    ]
                });
            }

            await webhookClient.destroy();
        }
        catch (e) {
            console.log(e);
        }
    }
}