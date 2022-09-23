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

import DiscordClient from "./Client";

import path from "path";
import fs from "fs";

export type config = {
    [key: string]: any;
};

export type configContainer = {
    [guildID: string | number]: config;  
};

export class Config {
    props: configContainer = {};
    client: DiscordClient;
    configPath: string;

    constructor(client: DiscordClient) {
        this.client = client;
        console.log(`ENV: ${process.env.SUDO_PREFIX}`);
        this.configPath = path.resolve(process.env.SUDO_PREFIX ?? this.client.rootdir, "config", "config.json");
        this.load();
    }

    load() {
        fs.readFile(this.configPath, (err, data) => {
            if (err) {
                console.log(err);
            }

            this.props = JSON.parse(data.toString());
        });
    }

    write() {
        fs.writeFile(this.configPath, JSON.stringify(this.props, undefined, ' '), () => null);
    }

    get(key: string) {
        return typeof this.props[this.client.msg!.guild!.id] === 'object' ? this.props[this.client.msg!.guild!.id][key] : null;
    }

    set(key: string, value: any) {
        this.props[this.client.msg!.guild!.id][key] = value;
    }
}
