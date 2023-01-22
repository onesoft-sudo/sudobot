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

import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { runTimeouts } from '../../utils/setTimeout';
import { LogLevel } from '../../services/DebugLogger';
import { exit } from 'process';
import Punishment from '../../models/Punishment';
import Counter from '../../models/Counter';

export default class ReadyEvent extends BaseEvent {
    constructor() {
        super('ready');
    }
    
    async run(client: DiscordClient) {
        console.log(`\nLogged in as ${client.user!.tag}!`);
        await client.server.run();

        runTimeouts();
        client.queueManager.loadQueues();
        client.startupManager.boot();
        client.randomStatus.update();
        client.autobackup.onReady().catch(console.error);

        for (const guild of client.guilds.cache.toJSON()) {
            console.log(guild.id + ' ' + guild.name);         
            
            if (!client.config.props[guild.id]) {
                console.log('Unauthorized guilds found! Please run the cli with `guildpurge` command to remove unauthorized guilds.');
                await client.debugLogger.logLeaveJoin(LogLevel.CRITICAL, `Unauthorized guild detected: ${guild.name} [ID: ${guild.id}]`);
                exit(-1);                
            }
        }

        for (const guild of client.guilds.cache.values()) {
            if (client.config.props[guild.id].invite_tracking?.enabled) {
                client.inviteTracker.refreshInvites(guild).catch(console.error);
            }
        }

        if ((await Counter.count()) < 1) {
            const lastPunishment = await Punishment.findOne({}, undefined, {
                sort: {
                    createdAt: -1 
                }
            });

            await Counter.create({
                _id: 'punishments_id',
                seq: lastPunishment!.numericId
            });
        }
    }
}