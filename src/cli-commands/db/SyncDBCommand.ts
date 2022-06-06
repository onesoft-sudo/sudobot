import { readdir } from "fs/promises";
import path from "path";
import { exit } from "process";
import readline from "readline";
import DiscordClient from "../../client/Client";
import BannedGuild from "../../models/BannedGuilds";
import BaseCLICommand from "../../utils/structures/BaseCLICommand";

export default class SyncDBCommand extends BaseCLICommand {
    constructor() {
        super('syncdb', 'guild');
    }

    async run(client: DiscordClient, argv: string[], args: string[]) {
        const files = await readdir(path.join(__dirname, '/../../models'));

        for await (const file of files) {
            if (file === '..' || file === '.')
                continue;
            
            const { default: model } = await import(path.join(__dirname, '/../../models', file));
            await model.sync({
                logging: console.log
            });
        }

        exit(0);
    }
}