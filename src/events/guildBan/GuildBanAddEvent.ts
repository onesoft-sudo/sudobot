import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildBan } from 'discord.js';

export default class GuildBanAddEvent extends BaseEvent {
    constructor() {
        super('guildBanAdd');
    }
    
    async run(client: DiscordClient, ban: GuildBan) {
        await client.logger.logBanned(ban);
    }
}