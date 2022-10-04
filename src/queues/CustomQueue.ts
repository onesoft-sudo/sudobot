import { TextChannel } from "discord.js";
import CommandOptions from "../types/CommandOptions";
import { fetchEmoji } from "../utils/Emoji";
import Queue from "../utils/structures/Queue";

export default class CustomQueue extends Queue {
    async execute({ channelID, guildID, messageID, cmd }: { [key: string]: string }): Promise<any> {
        const guild = this.client.guilds.cache.get(guildID);

        if (!guild) {
            return;
        }

        const channel = guild.channels.cache.get(channelID) as TextChannel;

        if (!channel || !['GUILD_TEXT', 'GUILD_NEWS', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'].includes(channel.type)) {
            return;
        }

        try {
            const message = await channel.messages.fetch(messageID);

            if (message) {
                const [commandName, ...args] = cmd;
                const command = this.client.commands.get(commandName);

                if (!command) {
                    return message.reply(":x: Command not found");
                }

                if (!command.supportsLegacy) {
                    return message.reply(":x: This command does not support legacy message handler.");
                }

                const allowed = await this.client.auth.verify(message.member!, command);

                if (!allowed) {
                    return message.reply(":x: Operation not permitted. You don't have enough permissions.");
                }

                const options = {
                    cmdName: commandName,
                    args,
                    argv: [commandName, ...args],
                    normalArgs: args.filter(a => a[0] !== '-'),
                    options: args.filter(a => a[0] === '-'),
                    isInteraction: false
                } as CommandOptions;
                
                await command.execute(this.client, message, options);   
            }
        }
        catch (e) {
            console.log(e);
        }
    }
}