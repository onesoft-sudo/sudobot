import { CommandInteraction, Emoji, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import axios from 'axios';
import path from 'path';
import { deleteFile, download, timeSince } from '../../utils/util';
import MessageEmbed from '../../client/MessageEmbed';

export default class EmojiCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('emoji', 'information', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(':x: This command requires at least one argument.')
                ]
            });

            return;
        }

        let emojiString: string;

        if (options.isInteraction) {
            emojiString = await <string> options.options.getString('emoji');
        }
        else {
            emojiString = options.args[0];
        }

        if (emojiString.startsWith('<:') && emojiString.endsWith('>')) {
            console.log(emojiString);
            emojiString = emojiString.substring(2, emojiString.length - 1);
        }
        
        const emoji = await client.emojis.cache.find(e => e.name === emojiString || e.identifier === emojiString);

        if (!emoji) {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription('No emoji found or not a guild based emoji!')
                ]
            });

            return;
        }       

        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: emoji.guild.name,
                    iconURL: emoji.guild.iconURL()!,
                })
                .setTitle(emoji.name ?? 'Emoji Information')
                .addField('Name', emoji.name ?? '*No name set*')
                .addField('Identifier', emoji.identifier ?? '*No identifier set*')
                .addField('Available', emoji.available ? 'Yes' : 'No')
                .addField('Created at', timeSince(emoji.createdAt.getTime()))
                .addField('Download', `[Click here](${emoji.url})`)
                .setImage(emoji.url)
                .setFooter({
                    text: `ID: ${emoji.id}`
                })
            ]
        });
    }
}