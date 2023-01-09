import { TextChannel } from "discord.js";
import path from "path";
import DiscordClient from "../client/Client";
import Service from "../utils/structures/Service";

export default class Autobackup extends Service {
    interval: NodeJS.Timer | undefined;

    async onReady() {
        if (process.env.AUTOBACKUP_CHANNEL) {
            this.interval = setInterval(async () => {
                await this.backup();
            }, 1000 * 60 * 60 * 2);

            this.backup().catch(console.error);
        }
    }

    async backup() {
        try {
            const channel = <TextChannel | undefined> await this.client.channels.fetch(process.env.AUTOBACKUP_CHANNEL!);

            if (channel) {
                await channel.send({
                    content: 'Backup: Config Files',
                    files: [
                        path.resolve(process.env.SUDO_PREFIX ?? `${__dirname}/../..`, 'config/config.json'),
                        path.resolve(process.env.SUDO_PREFIX ?? `${__dirname}/../..`, 'config/snippets.json')
                    ]
                })
            }
        }
        catch (e) {
            console.log(e);
        }
    }
}