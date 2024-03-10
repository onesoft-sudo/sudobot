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

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Message,
    User
} from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn } from "../../core/Command";
import { logError } from "../../utils/Logger";
import { getComponentEmojiResolvable, isTextableChannel } from "../../utils/utils";

export default class BallotCreateCommand extends Command {
    public readonly name = "ballot__create";
    public readonly permissions = [];
    public readonly description = "Sends a poll/ballot embed.";
    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            await this.error(message, "Please provide the content to put inside the ballot/poll!");
            return;
        }

        await this.deferIfInteraction(message, { ephemeral: true });

        const content = context.isLegacy
            ? (message as Message).content
                  .substring(
                      this.client.configManager.config[message.guildId!]?.prefix?.length ?? 1
                  )
                  .trimStart()
                  .substring(context.argv[0] === "ballot" ? "ballot".length : 0)
                  .trimStart()
                  .substring(
                      context.argv[0] === "ballot"
                          ? this.name.replace("ballot__", "").length
                          : context.argv[0].length
                  )
                  .trim()
            : context.options.getString("content", true);

        const anonymous =
            (context.isLegacy ? null : context.options.getBoolean("anonymous")) ?? false;
        const channel =
            (context.isLegacy
                ? null
                : context.options.getChannel<ChannelType.GuildText>("channel")) ?? message.channel!;

        if (!isTextableChannel(channel)) {
            await this.error(message, "Cannot send messages into a non-text based channel!");
            return;
        }

        try {
            const ballotMessage = await channel.send({
                embeds: [
                    {
                        author: {
                            icon_url: anonymous
                                ? message.guild?.iconURL() ?? undefined
                                : (message.member?.user as User).displayAvatarURL(),
                            name: anonymous ? "Staff" : message.member!.user.username
                        },
                        color: 0x007bff,
                        description: content,
                        footer: {
                            text: "0 Votes • React to vote!"
                        }
                    }
                ],
                files:
                    message instanceof Message
                        ? message.attachments.map(({ name, proxyURL }) => ({
                              name,
                              attachment: proxyURL
                          }))
                        : undefined,
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId("ballot__upvote")
                            .setEmoji(getComponentEmojiResolvable(this.client, "ArrowTop") ?? "⬆️")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId("ballot__downvote")
                            .setEmoji(getComponentEmojiResolvable(this.client, "ArrowDown") ?? "⬇️")
                            .setStyle(ButtonStyle.Secondary)
                    )
                ]
            });

            try {
                const ballot = await this.client.ballotManager.create({
                    content,
                    guildId: message.guildId!,
                    userId: message.member!.user.id,
                    channelId: channel.id,
                    messageId: ballotMessage.id,
                    anonymous,
                    files:
                        message instanceof Message
                            ? [...message.attachments.map(a => a.proxyURL).values()]
                            : []
                });

                await this.success(
                    message,
                    `The ballot/poll has been created successfully.\nID: \`${ballot.id}\`\n${
                        message instanceof Message && message.attachments.size > 0
                            ? "Please do not delete your message, otherwise the attachments will be lost."
                            : ""
                    }`
                );
            } catch (e) {
                logError(e);
                return;
            }
        } catch (e) {
            logError(e);

            await this.error(
                message,
                "An error has occurred while sending the message. Make sure I have enough permissions to send messages here!"
            );

            return;
        }
    }
}
