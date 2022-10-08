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

let prefix = '-', homeGuild = '', owners = [];

(async () => {
    console.log(`SudoBot version ${version}`);
    console.log(`Copyright (C) OSN Inc 2022`);
    console.log(`Thanks for using SudoBot! We'll much appreciate if you star the repository on GitHub.\n`);
    
    prefix = (await promptLoop(`What will be the bot prefix? [${prefix}]: `, input => {
        if (input.trim().includes(' ')) {
            console.log(`Prefixes must not contain spaces!`);
            return false;
        }

        return true;
    }, prefix)).trim();

    homeGuild = await promptLoop(`What will be the Home/Support Guild ID?: `, snowflakeValidator);
    owners = (await promptLoop(`Who will be the owner? Specify the owner user IDs separated with comma (,): `, input => {
        const splitted = input.split(',');

        for (const snowflake of splitted) {
            if (!snowflakeValidator(snowflake)) {
                console.log(`Invalid snowflake given! Make sure that the IDs are correctly given!`);
                return false;
            }
        }

        return true;
    })).split(',').map(s => s.trim());

    let config = Object.entries(JSON.parse((await fs.readFile(SAMPLE_CONFIG_PATH)).toString()));
    config[1][0] = homeGuild;
    config[1][1].prefix = prefix;
    config = Object.fromEntries(config);

    config.global.id = homeGuild;
    config.global.owners = owners;

    console.log(config);

    if (existsSync(CONFIG_PATH)) {
        const input = await promptDefault("The config file (config/config.json) already exists. Do you want to overwrite the file? [y/N]: ", "n");

        if (input.trim().toLowerCase() !== "y" && input.trim().toLowerCase() !== "yes") {
            console.log("Aborting setup.");
            rl.close();
            process.exit(1);
        }
    }

    rl.close();

    console.log("Setup complete!");
    console.table([
        {
            prefix,
            homeGuild
        }
    ]);
})().catch(console.error);