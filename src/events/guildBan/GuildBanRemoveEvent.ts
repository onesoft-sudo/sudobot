import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { GuildBan } from 'discord.js';

export default class GuildBanRemoveEvent extends BaseEvent {
    constructor() {
        super('guildBanRemove');
    }
    
    async run(client: DiscordClient, ban: GuildBan) {
        await client.logger.logUnbanned(ban);
    }
}