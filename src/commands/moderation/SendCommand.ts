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

import { APIEmbed, AttachmentPayload, Message, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import EmbedSchemaParser from "../../utils/EmbedSchemaParser";
import { userInfo } from "../../utils/embed";
import { logError } from "../../utils/Logger";
import { getEmojiObject } from "../../utils/utils";

export default class EchoCommand extends Command {
    public readonly name = "send";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            entity: true,
            errors: {
                "entity:null": "This user does not exist!",
                "type:invalid": "Please provide a valid user to DM!",
                required: "Please provide a user to DM!"
            }
        },
        {
            types: [ArgumentType.StringRest],
            name: "content",
            errors: {
                required: "Please provide the message content!"
            },
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
                    : await message.react((await getEmojiObject(this.client, "check"))!).catch(logError);
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

        const embed: APIEmbed = {};

        await this.sendCommandRanLog(message, embed, {
            previews: [options],
            url: null,
            async before(channel, sentMessages) {
                embed.description = `The message preview is [above](${sentMessages[0]?.url}).`;
            },
            fields(fields) {
                return [
                    ...fields,
                    {
                        name: "User (The person who received the DM)",
                        value: userInfo(user),
                        inline: true
                    }
                ];
            }
        });
    }
}
