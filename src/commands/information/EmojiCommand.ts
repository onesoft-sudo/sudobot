/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { formatDistanceToNowStrict } from "date-fns";
import { EmbedBuilder, SlashCommandBuilder, parseEmoji } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class EmojiCommand extends Command {
    public readonly name = "emoji";
    public readonly validationRules: ValidationRule[] = [
        {
            name: "emoji",
            types: [ArgumentType.String],
            requiredErrorMessage: "Please specify a server-based emoji!",
            typeErrorMessage: "Invalid emoji specified"
        }
    ];
    public readonly permissions = [];
    public readonly description = "Shows information about a server-based emoji.";
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("emoji").setDescription("The target emoji").setRequired(true)
    );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const emojiString = context.isLegacy ? context.parsedNamedArgs.emoji : context.options.getString("emoji", true);
        const emojiSubString =
            emojiString.startsWith("<:") && emojiString.endsWith(">")
                ? emojiString.substring(2, emojiString.length - 1)
                : emojiString;

        const emoji = await this.client.emojis.cache.find(
            e => e.name === emojiSubString || e.identifier === emojiSubString || e.id === emojiSubString
        );

        if (!emoji) {
            if ((emojiString.startsWith("<:") && emojiString.endsWith(">")) || /\d+/g.test(emojiString)) {
                let parsedEmoji =
                    emojiString.startsWith("<:") && emojiString.endsWith(">")
                        ? parseEmoji(emojiString)
                        : { animated: undefined, id: emojiString, name: undefined };

                if (!parsedEmoji) {
                    await this.error(message, "Invalid emoji specified");
                    return;
                }

                await message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#007bff")
                            .setAuthor({
                                name: parsedEmoji.name ?? "Unknown Emoji",
                                iconURL: `https://cdn.discordapp.com/emojis/${parsedEmoji.id}`
                            })
                            .setFields(
                                {
                                    name: "Animated",
                                    value:
                                        parsedEmoji.animated !== undefined
                                            ? parsedEmoji.animated
                                                ? "Yes"
                                                : "No"
                                            : "*The system could not load enough information*"
                                },
                                {
                                    name: "Download",
                                    value: `[Click Here](https://cdn.discordapp.com/emojis/${parsedEmoji.id})`
                                }
                            )
                            .setThumbnail(`https://cdn.discordapp.com/emojis/${parsedEmoji.id}`)
                            .setFooter({
                                text: `ID: ${parsedEmoji.id}`
                            })
                    ]
                });
            } else {
                await message.reply({
                    embeds: [new EmbedBuilder().setColor("#f14a60").setDescription("No emoji found or not a guild based emoji!")]
                });
            }

            return;
        }

        await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name: emoji.guild.name,
                        iconURL: emoji.guild.iconURL()!
                    })
                    .setTitle(emoji.name ?? "Emoji Information")
                    .setFields(
                        { name: "Name", value: emoji.name ?? "*No name set*" },
                        { name: "Identifier", value: emoji.identifier ?? "*No identifier set*" },
                        { name: "Available", value: emoji.available ? "Yes" : "No" },
                        { name: "Created", value: formatDistanceToNowStrict(emoji.createdAt, { addSuffix: true }) },
                        { name: "Download", value: `[Click here](${emoji.url})` }
                    )
                    .setThumbnail(emoji.url)
                    .setFooter({
                        text: `ID: ${emoji.id}`
                    })
            ]
        });
    }
}
