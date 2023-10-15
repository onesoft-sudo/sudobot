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

import { EmbedBuilder, SlashCommandBuilder, parseEmoji } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { safeChannelFetch, safeMessageFetch } from "../../utils/fetch";

export default class ExtractEmojiCommand extends Command {
    public readonly name = "extractemoji";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.Link],
            name: "message_link",
            rawLinkString: true,
            requiredErrorMessage: "Please provide a message link to extract emoji from!",
            typeErrorMessage: "Invalid message link given!"
        }
    ];
    public readonly permissions = [];
    public readonly aliases = ["getemojis", "extractemojis", "getemojis"];
    public readonly description = "Extracts server emoji links from the given message.";
    public readonly argumentSyntaxes = ["<message_link>"];
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("message_link").setDescription("Link to the target message").setRequired(true)
    );

    extract(content: string) {
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

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const link = context.isLegacy ? context.parsedNamedArgs.message_link : context.options.getString("message_link", true);

        if (!/^https?:\/\/(canary\.|ptb\.|beta\.|www\.|)discord\.com\/channels\/\d+\/\d+\/\d+$/i.test(link.trim())) {
            await this.error(message, this.validationRules[0].typeErrorMessage);
            return;
        }

        const [messageId, channelId, guildId] = link
            .substring(0, link[link.length - 1] === "/" ? link.length - 1 : link.length)
            .split("/")
            .reverse();

        if (guildId !== message.guildId!) {
            await this.error(message, "That's a message link from another server!");
            return;
        }

        const channel = await safeChannelFetch(message.guild!, channelId);

        if (!channel) {
            await this.error(message, "The link is invalid, couldn't find the specified channel!");
            return;
        }

        if (!channel.isTextBased()) {
            await this.error(message, "The link points to a non-text based channel!");
            return;
        }

        const targetMessage = await safeMessageFetch(channel, messageId);

        if (!targetMessage) {
            await this.error(
                message,
                "The link is invalid, couldn't find the specified message! Make sure that it wasn't deleted."
            );
            return;
        }

        const parsedEmojis = this.extract(targetMessage.content);

        for (const embed of targetMessage.embeds) {
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
            if (!!emojis.find(e => e.id === emoji.id)) {
                continue;
            }

            emojis.push(emoji);
        }

        if (emojis.length === 0) {
            await this.error(message, "Could not find any server-based emoji in the given message.");
            return;
        }

        let description = "";

        for (const { name, url, animated } of emojis) {
            description += `* [${name}](${url})${animated ? " (Animated)" : ""}\n`;
        }

        await this.deferredReply(message, {
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
}
