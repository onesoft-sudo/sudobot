import { exit } from "process";
import DiscordClient from "../../client/Client";
import BaseCLICommand from "../../utils/structures/BaseCLICommand";

export default class GuildLeaveCommand extends BaseCLICommand {
    requiredArgs = 1;

    constructor() {
        super('guildleave', 'guild');
    }

    async run(client: DiscordClient, argv: string[], args: string[]) {
        const guild_id = args.shift()!;
        let reason: string | null = null;

        if (args.length > 0)
            reason = args.join(' ');

        const guild = await client.guilds.cache.get(guild_id);

        if (!guild) {
            console.error("Failed to find a guild with ID " + guild_id);
            exit(-1);
        }
        
        await guild.leave();

        console.log(`Succesfully left guild: ${guild.name} (${guild.id})`);
        
        await exit(0);
    }
}