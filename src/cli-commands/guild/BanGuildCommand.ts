import { exit } from "process";
import DiscordClient from "../../client/Client";
import BannedGuild from "../../models/BannedGuild";
import BaseCLICommand from "../../utils/structures/BaseCLICommand";

export default class BanGuildCommand extends BaseCLICommand {
    requiredArgs = 1;

    constructor() {
        super('banguild', 'guild');
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
        
        await BannedGuild.create({
            guild_id,
            reason
        });

        await guild.leave();

        console.log(`Succesfully banned and left guild: ${guild.name} (${guild.id})`);
        
        await exit(0);
    }
}