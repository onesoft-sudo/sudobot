import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { runTimeouts } from '../../utils/setTimeout';
import { LogLevel } from '../../services/DebugLogger';
import { Guild } from 'discord.js';

export default class GuildDeleteEvent extends BaseEvent {
    constructor() {
        super('guildDelete');
    }
    
    async run(client: DiscordClient, guild: Guild) {
        await client.debugLogger.logLeaveJoin(LogLevel.INFO, `Left a guild: ${guild.name} [ID: ${guild.id}]`);
    }
}