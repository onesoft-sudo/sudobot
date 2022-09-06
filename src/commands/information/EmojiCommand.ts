import { CommandInteraction, Message, Util } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { timeSince } from '../../utils/util';
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

        const emojiSubString = emojiString.startsWith('<:') && emojiString.endsWith('>') ? emojiString.substring(2, emojiString.length - 1) : emojiString;
        
        let emoji = await client.emojis.cache.find(e => e.name === emojiSubString || e.identifier === emojiSubString || e.id === emojiSubString);

        if (!emoji) {
            if ((emojiString.startsWith('<:') && emojiString.endsWith('>')) || /\d+/g.test(emojiString)) {
                let parsedEmoji = emojiString.startsWith('<:') && emojiString.endsWith('>') ? Util.parseEmoji(emojiString) : { animated: undefined, id: emojiString, name: undefined };

                if (!parsedEmoji) {
                    await msg.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription('Invalid emoji!')
                        ]
                    });

                    return;
                }

                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setAuthor({
                            name: parsedEmoji.name ?? "Unknown Emoji",
                            iconURL: `https://cdn.discordapp.com/emojis/${parsedEmoji.id}`,
                        })
                        .setFields({
                            name: "Animated",
                            value: parsedEmoji.animated !== undefined ? parsedEmoji.animated ? 'Yes' : 'No' : "*The system could not load enough information*",
                        }, {
                            name: "Download",
                            value: `[Click Here](https://cdn.discordapp.com/emojis/${parsedEmoji.id})`
                        })
                        .setThumbnail(`https://cdn.discordapp.com/emojis/${parsedEmoji.id}`)
                        .setFooter({
                            text: `ID: ${parsedEmoji.id}`
                        })
                    ]
                });
            }
            else {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription('No emoji found or not a guild based emoji!')
                    ]
                });
            }

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
                .addField('Created', timeSince(emoji.createdAt.getTime()))
                .addField('Download', `[Click here](${emoji.url})`)
                .setThumbnail(emoji.url)
                .setFooter({
                    text: `ID: ${emoji.id}`
                })
            ]
        });
    }
}