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

    constructor(client: DiscordClient) {
        this.client = client;
        this.load();
    }

    load() {
        fs.readFile(path.resolve(__dirname, this.client.rootdir, "config", "config.json"), (err, data) => {
            if (err) {
                console.log(err);
            }

            this.props = JSON.parse(data.toString());
        });
    }

    write() {
        fs.writeFile(path.resolve(__dirname, this.client.rootdir, "config", "config.json"), JSON.stringify(this.props, undefined, ' '), () => null);
    }

    get(key: string) {
        return typeof this.props[this.client.msg!.guild!.id] === 'object' ? this.props[this.client.msg!.guild!.id][key] : null;
    }

    set(key: string, value: any) {
        this.props[this.client.msg!.guild!.id][key] = value;
    }
}