import 'reflect-metadata';
import { registerCommands, registerEvents } from './utils/registry';
import DiscordClient from './client/Client';
import { Intents } from 'discord.js';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { registrationEnd, registrationStart } from './utils/debug';
import { yellow } from './utils/util';

if (existsSync(path.join(__dirname, '../.env'))) {
    config();
}
else {
    process.env.ENV = 'prod';
}

if (process.argv.includes('--prod')) {
    console.warn(yellow('WARNING: Forcing production mode (--prod option passed)'));
    process.env.ENV = 'prod';
}

if (process.argv.includes('--dev')) {
    console.warn(yellow('WARNING: Forcing development mode (--dev option passed)'));
    process.env.ENV = 'dev';
}

const client = new DiscordClient({
    partials: ["CHANNEL"],
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES, 
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    ]
}, path.resolve(__dirname, '..'));

(async () => {
    await registrationStart();
    await registerCommands(client, '../commands');
    await registrationEnd();
    
    await registrationStart();
    await registerEvents(client, '../events');
    await registrationEnd();
    
    await client.login(process.env.TOKEN);
    await console.log('test');
})();