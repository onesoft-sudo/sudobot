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

import readline from "readline";
import DiscordClient from "../../client/Client";
import BaseCLICommand from "../../utils/structures/BaseCLICommand";

export default class GuildPurgeCommand extends BaseCLICommand {
    constructor() {
        super('guildpurge', 'guild');
    }

    async run(client: DiscordClient, argv: string[], args: string[]) {
        for (const guild of client.guilds.cache.toJSON()) {        
            if (!client.config.props[guild.id]) {
                const io = await readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                });
                
                await io.question(`Found an unauthorized guild: ${guild.name} (${guild.id}), please type 'yes' / 'y' confirm the bot to leave.\n`, async input => {
                    if (input.toLowerCase() === 'y' || input.toLowerCase() === 'yes') {
                        await guild.leave();
                        await console.log(`Left guild: ${guild.name} (${guild.id})`);                        
                    } 
                    else {
                        await console.log('Operation canceled.');         
                    }                 

                    await io.close();
                });
            }
        }
    }
}