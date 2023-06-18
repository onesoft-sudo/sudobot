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

import { TextChannel } from "discord.js";
import path from "path";
import DiscordClient from "../client/Client";
import Service from "../utils/structures/Service";

export default class Autobackup extends Service {
    interval: NodeJS.Timer | undefined;

    async onReady() {
        if (process.env.AUTOBACKUP_CHANNEL) {
            this.interval = setInterval(async () => {
                await this.backup();
            }, 1000 * 60 * 60 * 2);

            this.backup().catch(console.error);
        }
    }

    async backup() {
        try {
            const channel = <TextChannel | undefined> await this.client.channels.fetch(process.env.AUTOBACKUP_CHANNEL!);

            if (channel) {
                await channel.send({
                    content: 'Backup: Config Files',
                    files: [
                        path.resolve(process.env.SUDO_PREFIX ?? `${__dirname}/../..`, 'config/config.json'),
                        path.resolve(process.env.SUDO_PREFIX ?? `${__dirname}/../..`, 'config/snippets.json')
                    ]
                })
            }
        }
        catch (e) {
            console.log(e);
        }
    }
}