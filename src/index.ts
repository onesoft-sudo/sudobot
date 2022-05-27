import { registerCommands, registerEvents } from './utils/registry';
import DiscordClient from './client/Client';
import { Intents } from 'discord.js';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

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

if (existsSync(path.join(__dirname, '../.env'))) {
    config();
}
else {
    process.env.ENV = 'prod';
}

(async () => {
    await registerCommands(client, '../commands');
    await registerEvents(client, '../events');
    await client.login(process.env.token);
})();