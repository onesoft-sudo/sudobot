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

import { unmute } from "../commands/moderation/UnmuteCommand";
import MuteRecord from "../models/MuteRecord";
import Queue from "../utils/structures/Queue";

export default class UnmuteQueue extends Queue {
    cancel(): Promise<void> {
        console.log("Canceling unmute");
        return super.cancel();
    }

    async execute({ memberID, guildID }: { [key: string]: string }): Promise<any> {     
        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        try {
            const member = await guild.members.fetch(memberID);

            if (member) {
                await unmute(this.client, member, this.client.user!);
            }
            else {
                throw new Error();
            }
        }
        catch (e) {
            console.log(e);   
            
            const muteRecord = await MuteRecord.findOne({
                memberID,
                guildID
            });
    
            if (muteRecord) {
                await muteRecord.delete();
            }
        }

        // try {
        //     const member = await guild.members.fetch(memberID);
        //     console.log("Unmuting", member.user.tag);
            
        //     await unmute(this.client, member, this.client.user!);
        // }
        // catch (e) {
        //     console.log(e);
        // }
    }
}