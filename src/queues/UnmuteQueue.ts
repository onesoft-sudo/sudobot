import { unmute } from "../commands/moderation/UnmuteCommand";
import MuteRecord from "../models/MuteRecord";
import Queue from "../utils/structures/Queue";

export default class UnmuteQueue extends Queue {
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