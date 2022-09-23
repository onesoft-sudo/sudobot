#!/usr/bin/ts-node

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

import { registerCLICommands } from './utils/registry';
import DiscordClient from './client/Client';
import { Intents } from 'discord.js';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
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

client.on('ready', async () => {
    console.log('The system has logged into discord.');
    await registerCLICommands(client, '../cli-commands');

    const { argv, exit } = process;

    argv.shift();
    argv.shift();

    if (!argv[0]) {
        console.log('No command provided.');
        exit(-1);
    }

    const commandName = argv.shift();
    const command = client.cliCommands.get(commandName!);

    if (!command) {
        console.log(`${commandName}: command not found`);
        exit(-1);
    }

    const options = argv.filter(a => a[0] === '-');
    const args = argv.filter(a => a[0] !== '-');

    if (command!.requiredArgs > args.length) {
        console.log(`${commandName}: expected at least ${command!.requiredArgs} arguments`);
        exit(-1);
    }

    if (command!.requiredOptions > options.length) {
        console.log(`${commandName}: expected at least ${command!.requiredOptions} options`);
        exit(-1);
    }

    await command!.run(client, argv, args, options);
});

client.login(process.env.TOKEN);