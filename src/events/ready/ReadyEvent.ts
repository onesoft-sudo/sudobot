import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { runTimeouts } from '../../utils/setTimeout';
import { LogLevel } from '../../services/DebugLogger';
import BannedGuild from '../../models/BannedGuild';
import { exit } from 'process';

export default class ReadyEvent extends BaseEvent {
    constructor() {
        super('ready');
    }
    
    async run(client: DiscordClient) {
        console.log(`\nLogged in as ${client.user!.tag}!`);
        client.server.run();
        runTimeouts();
        client.startupManager.boot();
        client.randomStatus.update();

        for (const guild of client.guilds.cache.toJSON()) {
            console.log(guild.id + ' ' + guild.name);         
            
            if (!client.config.props[guild.id]) {
                console.log('Unauthorized guilds found! Please run the cli with `guildpurge` command to remove unauthorized guilds.');
                await client.debugLogger.logLeaveJoin(LogLevel.CRITICAL, `Unauthorized guild detected: ${guild.name} [ID: ${guild.id}]`);
                exit(-1);                
            }
        }
    }
}