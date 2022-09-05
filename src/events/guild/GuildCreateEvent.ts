import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { runTimeouts } from '../../utils/setTimeout';
import { LogLevel } from '../../services/DebugLogger';
import { Guild } from 'discord.js';

export default class GuildCreateEvent extends BaseEvent {
    constructor() {
        super('guildCreate');
    }
    
    async run(client: DiscordClient, guild: Guild) {
        await client.debugLogger.logLeaveJoin(LogLevel.INFO, `Joined a guild: ${guild.name} [ID: ${guild.id}]`);

        if (!client.config.props[guild.id]) {
            await client.debugLogger.logLeaveJoin(LogLevel.CRITICAL, `Unauthorized guild detected: ${guild.name} [ID: ${guild.id}]`);
            await guild.leave();
        }
    }
}