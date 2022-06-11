import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildMember } from 'discord.js';
import UnverifiedMember from '../../models/UnverifiedMember';

export default class GuildMemberRemoveEvent extends BaseEvent {
    constructor() {
        super('guildMemberRemove');
    }
    
    async run(client: DiscordClient, member: GuildMember) {
        if (member.user.id === client.user!.id)
            return;

        await client.logger.logLeft(member);
        await client.autoClear.start(member, member.guild);

        const verificationData = await UnverifiedMember.findOne({
            where: {
                guild_id: member.guild.id,
                user_id: member.id,
                status: 'pending'
            }
        });

        if (verificationData) {
            await verificationData.set('status', 'canceled');
            await verificationData.save();
        }
    }
}