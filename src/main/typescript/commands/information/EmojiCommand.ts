/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    parseEmoji,
    time
} from "discord.js";

type EmojiCommandArgs = {
    emoji: string;
};

@ArgumentSchema.Definition({
    names: ["emoji"],
    types: [StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "Please provide an emoji."
        }
    ]
})
class EmojiCommand extends Command {
    public override readonly name = "emoji";
    public override readonly description: string = "Show the information about an emoji.";
    public override readonly defer = true;
    public override readonly usage = ["<emoji: GuildEmoji>"];
    public override readonly systemPermissions = [];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption(option =>
                option
                    .setName("emoji")
                    .setDescription("The emoji you want to get information about.")
                    .setRequired(true)
            )
        ];
    }

    public override async execute(context: Context, args: EmojiCommandArgs): Promise<void> {
        const emojiString = args.emoji;
        const emojiSubString =
            emojiString.startsWith("<:") && emojiString.endsWith(">")
                ? emojiString.substring(2, emojiString.length - 1)
                : emojiString;

        const emoji = await this.application.client.emojis.cache.find(
            e =>
                e.name === emojiSubString ||
                e.identifier === emojiSubString ||
                e.id === emojiSubString
        );

        if (!emoji) {
            if (
                (emojiString.startsWith("<:") && emojiString.endsWith(">")) ||
                /\d+/g.test(emojiString)
            ) {
                const parsedEmoji =
                    emojiString.startsWith("<:") && emojiString.endsWith(">")
                        ? parseEmoji(emojiString)
                        : { animated: undefined, id: emojiString, name: undefined };

                if (!parsedEmoji) {
                    await context.error("Invalid emoji specified");
                    return;
                }

                await context.reply({
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
                await context.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#f14a60")
                            .setDescription("No emoji found or not a guild based emoji!")
                    ]
                });
            }

            return;
        }

        await context.reply({
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
                        { name: "Created", value: time(emoji.createdAt, "R") }
                    )
                    .setThumbnail(emoji.url)
                    .setFooter({
                        text: `ID: ${emoji.id}`
                    })
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel("Download")
                        .setURL(emoji.imageURL())
                )
            ]
        });
    }
}

export default EmojiCommand;
