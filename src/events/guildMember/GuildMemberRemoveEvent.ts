import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildMember } from 'discord.js';

export default class GuildMemberRemoveEvent extends BaseEvent {
    constructor() {
        super('guildMemberRemove');
    }
    
    async run(client: DiscordClient, member: GuildMember) {
        await client.logger.logLeft(member);
    }
}