import { TextChannel } from "discord.js";
import { existsSync, readFile, rm } from "fs";
import { writeFile } from "fs/promises";
import MessageEmbed from "../client/MessageEmbed";
import { fetchEmoji } from "../utils/Emoji";
import Service from "../utils/structures/Service";
import { yellow } from "../utils/util";

export interface RestartLockFileData {
    date: string;
    message_id: string;
    channel_id: string;
    guild_id: string;
}

export default class StartupManager extends Service {
    async createLockFile(data: RestartLockFileData) {
        await writeFile(`${__dirname}/../../tmp/lock`, JSON.stringify(data));
    }

    async boot() {
        if (existsSync(`${__dirname}/../../tmp/lock`)) {
            readFile(`${__dirname}/../../tmp/lock`, async (err, data) => {
                const { date, message_id, channel_id, guild_id } = <RestartLockFileData> await JSON.parse(data.toString());

                console.warn(yellow('Lockfile detected - ' + new Date(date).toLocaleString()));

                await rm(`${__dirname}/../../tmp/lock`, () => console.log('Lockfile removed'));

                try {
                    const guild = await this.client.guilds.fetch(guild_id);
                    const channel = <TextChannel> await guild.channels.fetch(channel_id);
                    const message = await channel.messages.fetch(message_id);

                    if (message) {
                        await message.edit({
                            embeds: [
                                new MessageEmbed()
                                .setTitle('System Restart')
                                .setDescription(`${(await fetchEmoji('check'))?.toString()} Restart complete. (Took ${(Date.now() - new Date(date).getTime()) / 1000}s)`)
                            ],
                        });
                    }
                }
                catch(e) {
                    console.log(e);                    
                }
            });
        }
    }
}