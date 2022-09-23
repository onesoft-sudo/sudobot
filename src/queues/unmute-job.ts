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

import DiscordClient from "../client/Client";
import { unmute } from "../commands/moderation/UnmuteCommand";
import MuteRecord from "../models/MuteRecord";

export default async function unmuteJob(client: DiscordClient, guild_id: string, user_id: string) {
    console.log('top-level');
    
    const guild = await client.guilds.cache.get(guild_id);

    console.log(guild_id, user_id);
    

    // await client.db.get("SELECT * FROM unmutes WHERE time = ?", [new Date(dateTime!).toISOString()], async (err: any, data: any) => {
    //     if (err)
    //         console.log(err);
        
    //     if (data) {
    //         await client.db.get('DELETE FROM unmutes WHERE id = ?', [data.id], async (err: any) => {
    //             let guild = await client.guilds.cache.find(g => g.id === data.guild_id);
    //             let member = await guild?.members.cache.find(m => m.id === data.user_id);

    //             if (member) {
    //                 await unmute(client, member, client.user!);
    //                 await History.create(member.id, msg.guild!, 'unmute', client.user!.id, null);
    //             }

    //             console.log(data);
    //         });
    //     }
    // });

    if (guild) {
        console.log('here');
        
        try {
            const member = await guild.members.fetch(user_id);

            if (member) {
                console.log('here2');

                await unmute(client, member, client.user!);
            }
            else {
                throw new Error();
            }
        }
        catch (e) {
            console.log(e);   
            
            const muteRecord = await MuteRecord.findOne({
                user_id,
                guild_id
            });
    
            if (muteRecord) {
                await muteRecord.delete();
            }
        }
    }
}