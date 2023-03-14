import { Message } from "discord.js";
import DiscordClient from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import { emoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class SnipeCommand extends BaseCommand {
    name = "snipe";
    category = "information";

    async run(client: DiscordClient, message: Message, options: CommandOptions) {
        const { lastDeletedMessage } = client.utils;

        if (!lastDeletedMessage) {
            await message.reply(`${emoji('error')} No deleted message was recorded yet.`);
            return;
        }

        await message.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: lastDeletedMessage.author.tag,
                        iconURL: lastDeletedMessage.author.displayAvatarURL(),
                    },
                    color: 'RANDOM',
                    description: message.content,
                    footer: {
                        text: "Sniped"
                    }
                })
                .setTimestamp()
            ]
        });
    }
}