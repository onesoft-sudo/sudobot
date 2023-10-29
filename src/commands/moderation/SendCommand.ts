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

import { AttachmentPayload, Message, PermissionsBitField, SlashCommandBuilder, User } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import EmbedSchemaParser from "../../utils/EmbedSchemaParser";
import { channelInfo, messageInfo, userInfo } from "../../utils/embed";
import { safeChannelFetch } from "../../utils/fetch";
import { logError } from "../../utils/logger";

export default class EchoCommand extends Command {
    public readonly name = "send";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            entityNotNull: true,
            entityNotNullErrorMessage: "This user does not exist!",
            typeErrorMessage: "Please provide a valid user to DM!",
            requiredErrorMessage: "Please provide a user to DM!"
        },
        {
            types: [ArgumentType.StringRest],
            name: "content",
            requiredErrorMessage: "Please provide the message content!",
            optional: true
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly aliases = ["s", "dm", "message", "msg"];

    public readonly description = "Send a DM to a user.";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("user").setDescription("The user to DM"))
        .addStringOption(option => option.setName("content").setDescription("Message content"));

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message, {
            ephemeral: true
        });

        const user = !context.isLegacy ? context.options.getUser("user") : context.parsedNamedArgs.user;
        const content: string | undefined = !context.isLegacy
            ? context.options.getString("content", true)
            : context.parsedNamedArgs.content;
        const deleteReply =
            this.client.configManager.config[message.guildId!]?.commands?.moderation_command_behaviour === "delete";

        if (!content && message instanceof Message && message.attachments.size === 0) {
            await this.error(message, "Please provide the message content or attachments!");
            return;
        }

        const options = {
            content,
            files:
                message instanceof Message
                    ? message.attachments.map(
                          a =>
                              ({
                                  attachment: a.proxyURL,
                                  name: a.name,
                                  description: a.description
                              } as AttachmentPayload)
                      )
                    : undefined
        };

        let sentMessage: Message<boolean> | undefined = undefined;

        try {
            if (user) {
                sentMessage = await EmbedSchemaParser.sendMessage(user, options);
            }

            if (message instanceof Message) {
                deleteReply && message.deletable
                    ? await message.delete().catch(logError)
                    : await message.react(this.emoji("check"));
            } else {
                await this.deferredReply(message, {
                    content: `Message sent.`
                });
            }
        } catch (e) {
            logError(e);
            await this.error(
                message,
                `Could not deliver DM. Maybe the user does not share any server with me or has blocked me or disabled DMs?`
            );
        }

        if (!this.client.configManager.systemConfig.logging?.enabled) {
            return;
        }

        const logChannelId = this.client.configManager.systemConfig.logging?.channels?.echo_send_logs;

        if (logChannelId) {
            safeChannelFetch(await this.client.getHomeGuild(), logChannelId)
                .then(async channel => {
                    if (channel?.isTextBased()) {
                        const sentMessage = await EmbedSchemaParser.sendMessage(channel, options).catch(logError);

                        if (!sentMessage) {
                            return;
                        }

                        await channel
                            ?.send({
                                embeds: [
                                    {
                                        title: "The send command was executed",
                                        author: {
                                            name: message.member!.user.username,
                                            icon_url: (message.member!.user as User).displayAvatarURL?.()
                                        },
                                        description: `The message is [above](${sentMessage.url}).`,
                                        fields: [
                                            {
                                                name: "Guild",
                                                value: `${message.guild!.name} (${message.guild!.id})`,
                                                inline: true
                                            },

                                            {
                                                name: "Channel",
                                                value: channelInfo(message.channel!),
                                                inline: true
                                            },
                                            {
                                                name: "Mode",
                                                value: context.isLegacy ? "Legacy" : "Application Command"
                                            },
                                            {
                                                name: "User (The person who ran the command)",
                                                value: userInfo(message.member!.user as User),
                                                inline: true
                                            },
                                            {
                                                name: "User (The person who received the DM)",
                                                value: userInfo(user),
                                                inline: true
                                            },
                                            {
                                                name: "Message Info",
                                                value: !sentMessage ? "*Not available*" : messageInfo(sentMessage)
                                            }
                                        ],
                                        footer: {
                                            text: "Logged"
                                        },
                                        timestamp: new Date().toISOString(),
                                        color: 0x007bff
                                    }
                                ]
                            })
                            .catch(logError);
                    }
                })
                .catch(logError);
        }
    }
}
