import { TextChannel } from "discord.js";
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
                where: {
                    user_id,
                    guild_id
                }
            });
    
            if (muteRecord) {
                await muteRecord.destroy();
            }
        }
    }
}