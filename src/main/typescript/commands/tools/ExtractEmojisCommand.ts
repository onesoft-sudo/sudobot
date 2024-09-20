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
import { type Buildable, Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { fetchChannel, fetchMessage } from "@framework/utils/entities";
import { EmbedBuilder, parseEmoji } from "discord.js";

type ExtractEmojisCommandArgs = {
    message: string;
};

@ArgumentSchema.Definition({
    names: ["message"],
    types: [StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide a message link to extract emojis from."
        }
    ]
})
class ExtractEmojisCommand extends Command {
    public override readonly name: string = "extractemoji";
    public override readonly description: string =
        "Extracts server emoji links from the given message.";
    public override readonly defer = true;
    public override readonly aliases = ["exem", "emojiextract", "getemojis"];
    public override readonly usage = ["<user: User>"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption(option =>
                option
                    .setName("message")
                    .setDescription("The message link to extract emojis from.")
                    .setRequired(true)
            )
        ];
    }

    public override async execute(context: Context, args: ExtractEmojisCommandArgs) {
        if (
            !URL.canParse(args.message) ||
            !args.message.startsWith("https://discord.com/channels/")
        ) {
            return void (await context.error("Invalid message link provided."));
        }

        const [guildId, channelId, messageId] = args.message.split("/").slice(-3);

        if (!guildId || !channelId || !messageId) {
            return void (await context.error("Invalid message link provided."));
        }

        if (context.guildId !== guildId) {
            return void (await context.error("The message must be from this server."));
        }

        const channel = await fetchChannel(context.guild, channelId);

        if (!channel?.isTextBased()) {
            return void (await context.error("The message must be from a text channel."));
        }

        const message = await fetchMessage(channel, messageId);

        if (!message) {
            return void (await context.error("No such message with that link exists!"));
        }

        const parsedEmojis = this.extract(message.content);

        for (const embed of message.embeds) {
            if (embed.description) {
                parsedEmojis.push(...this.extract(embed.description));
            }

            for (const field of embed.fields) {
                if (field.value) {
                    parsedEmojis.push(...this.extract(field.value));
                }
            }
        }

        const emojis: typeof parsedEmojis = [];

        for (const emoji of parsedEmojis) {
            if (emojis.find(e => e.id === emoji.id)) {
                continue;
            }

            emojis.push(emoji);
        }

        if (emojis.length === 0) {
            await context.error("Could not find any server-based emoji in the given message.");
            return;
        }

        let description = "";

        for (const { name, url, animated } of emojis) {
            description += `* [${name}](${url})${animated ? " (Animated)" : ""}\n`;
        }

        await context.reply({
            embeds: [
                new EmbedBuilder({
                    title: "Extracted Emojis",
                    color: 0x007bff,
                    description,
                    footer: {
                        text: `Extracted ${emojis.length} emojis total`
                    }
                }).setTimestamp()
            ]
        });
    }

    private extract(content: string) {
        const emojis = [];
        const regexMatches = [...content.matchAll(/(<a?:[\w_]+:\d+>)/gim)].map(match => match[0]);

        for (const match of regexMatches) {
            const parsed = parseEmoji(match);

            if (!parsed?.id) {
                continue;
            }

            emojis.push({
                ...parsed,
                url: `https://cdn.discordapp.com/emojis/${encodeURIComponent(parsed.id)}.${parsed.animated ? "gif" : "png"}`
            });
        }

        return emojis;
    }
}

export default ExtractEmojisCommand;
