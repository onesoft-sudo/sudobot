import BaseEvent from '../../utils/structures/BaseEvent';
import DiscordClient from '../../client/Client';
import { runTimeouts } from '../../utils/setTimeout';

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
    }
}