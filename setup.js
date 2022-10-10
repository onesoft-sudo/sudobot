#!/bin/node

/**
* setup.js -- the installer script
* 
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

const path = require('path');
const fs = require('fs/promises');
const readline = require('readline');
const bcrypt = require('bcrypt');

const CONFIG_DIR = path.resolve(__dirname, 'config');
const { version } = require('./package.json');
const { existsSync } = require('fs');
const SAMPLE_CONFIG_PATH = path.resolve(CONFIG_DIR, 'sample-config.json');
const CONFIG_PATH = path.resolve(CONFIG_DIR, 'config.json');

const isSnowflake = text => /^\d+$/.test(text);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const prompt = text => new Promise(resolve => {
    rl.question(text, resolve);
});

const promptDefault = async (text, defaultValue) => {
    const input = await prompt(text);

    if (input.toString().trim() === '') {
        return defaultValue;
    }

    return input;
};

const promptLoop = async (text, validator, defaultValue) => {
    let fn = promptDefault;

    if (defaultValue === undefined) {
        fn = prompt;
    }

    const input = await fn(text, defaultValue);

    if (!(await validator(input ?? ''))) {
        return promptLoop(text, validator, defaultValue);
    }

    return input ?? '';
};

const snowflakeValidator = input => {
    if (!isSnowflake(input)) {
        console.log(`That's not a valid snowflake! Please enter a valid ID.`);
        return false;
    }

    return true;
};

(async () => {
    console.log(`SudoBot version ${version}`);
    console.log(`Copyright (C) OSN Inc 2022`);
    console.log(`Thanks for using SudoBot! We'll much appreciate if you star the repository on GitHub.\n`);

    let prefix = '-', homeGuild = '', owners = [];
    let config = Object.entries(JSON.parse((await fs.readFile(SAMPLE_CONFIG_PATH)).toString()));
    
    config[1][1].prefix = (await promptLoop(`What will be the bot prefix? [${prefix}]: `, input => {
        if (input.trim().includes(' ')) {
            console.log(`Prefixes must not contain spaces!`);
            return false;
        }

        return true;
    }, "-")).trim();

    homeGuild = await promptLoop(`What will be the Home/Support Guild ID?: `, snowflakeValidator);
    config[1][0] = homeGuild;

    config = Object.fromEntries(config);

    config.global.id = homeGuild;
    config.global.owners = (await promptLoop(`Who will be the owner? Specify the owner user IDs separated with comma (,): `, input => {
        const splitted = input.split(',');

        for (const snowflake of splitted) {
            if (!snowflakeValidator(snowflake)) {
                console.log(`Invalid snowflake given! Make sure that the IDs are correctly given!`);
                return false;
            }
        }

        return true;
    })).split(',').map(s => s.trim());

    // config[1][0] = homeGuild;
    // config[1][1].prefix = prefix;

    // config.global.owners = owners;

    const guildConfig = {...config[homeGuild]};

    guildConfig.mod_role = await promptLoop(`What will be the moderator role ID?: `, snowflakeValidator);
    guildConfig.admin = await promptLoop(`What will be the safe role ID?: `, snowflakeValidator);
    guildConfig.mute_role = await promptLoop(`What will be the muted role ID?: `, snowflakeValidator);
    guildConfig.gen_role = await promptLoop(`What will be the general role ID? [${homeGuild}]: `, snowflakeValidator, homeGuild);
    guildConfig.logging_channel = await promptLoop(`What will be the main logging channel ID?: `, snowflakeValidator);
    guildConfig.logging_channel_join_leave = await promptLoop(`What will be the join/leave logging channel ID?: `, snowflakeValidator);

    config[homeGuild] = guildConfig;

    console.log(config);

    if (existsSync(CONFIG_PATH)) {
        const input = await promptDefault("The config file (config/config.json) already exists. Do you want to overwrite the file? [y/N]: ", "n");

        if (input.trim().toLowerCase() !== "y" && input.trim().toLowerCase() !== "yes") {
            console.log("Aborting setup.");
            rl.close();
            process.exit(1);
        }
    }

    if (existsSync(CONFIG_PATH))
        await fs.rename(CONFIG_PATH, path.join(CONFIG_DIR, 'config-old-' + Math.round(Math.random() * 100000) + '.json'));

    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, undefined, ' '));

    console.log("Config File Created!");
    console.table([
        {
            prefix,
            homeGuild
        }
    ]);

    if (!existsSync(path.join(__dirname, ".env"))) {
        const input = (await promptDefault("Generate a `.env' file? [y/N]: ", "n")).toLowerCase();

        if (input !== 'yes' && input !== 'y') {
            return;
        }

        const token = await promptLoop("What's your bot token? ", input => {
            if (input.trim() !== '' && input.indexOf(' ') === -1) {
                return true;
            }

            console.log("That's not a valid token.");
            return false;
        });

        const clientID = await promptLoop("What's your bot's client ID? ", snowflakeValidator);

        const mongoURI = await promptLoop("Enter the MongoDB URI for the bot to connect: ", input => {
            if (input.trim() !== '' && input.indexOf(' ') === -1) {
                return true;
            }

            console.log("That's not a valid MongoDB URI.");
            return false;
        });

        const jwtSecret = (await promptLoop("Enter a JWT secret key (hit enter to generate automatically): ", input => {
            if (input.trim() !== '') {
                return true;
            }

            console.log("That's not a valid secret.");
            return false;
        }, null)) ?? bcrypt.hashSync(Math.random() + '', bcrypt.genSaltSync());

        const webhook = await promptLoop("Enter a webhook URL for sending debug logs: ", input => {
            if (input.trim() !== '' && input.indexOf(' ') === -1) {
                return true;
            }

            console.log("That's not a valid webhook URL.");
            return false;
        });

        await fs.writeFile(path.join(__dirname, ".env"), `# Environment Configuration
        
        TOKEN=${token}
        ENV=dev
        CLIENT_ID=${clientID}
        GUILD_ID=${homeGuild}
        MONGO_URI=${mongoURI}
        JWT_SECRET=${jwtSecret}
        DEBUG_WEBHOOK_URL=${webhook}
        `);
    }

    rl.close();
})().catch(console.error);