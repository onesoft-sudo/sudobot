import readline from "readline";
import DiscordClient from "../../client/Client";
import BannedGuild from "../../models/BannedGuilds";
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