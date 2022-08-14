import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildMember } from 'discord.js';
import autoRole from '../../services/AutoRole';

export default class GuildMemberAddEvent extends BaseEvent {
    constructor() {
        super('guildMemberAdd');
    }
    
    async run(client: DiscordClient, member: GuildMember) {
        if (member.user.id === client.user!.id)
            return;
        
        await client.logger.logJoined(member);
        
        if (member.user.bot)
            return;

        if (await client.antijoin.start(member)) {
            return;
        }
        
        await client.antiraid.start(member);
        await autoRole(client, member);

        await client.welcomer.start(member);

        if (client.config.props[member.guild.id].verification.enabled) {
            await client.verification.start(member);
        }
    }
}