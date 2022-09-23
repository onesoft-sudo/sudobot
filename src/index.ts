/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

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

console.log(`ENV: ${process.env.SUDO_PREFIX}`);

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
