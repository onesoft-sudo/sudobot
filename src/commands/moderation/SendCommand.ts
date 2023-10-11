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

import { AttachmentPayload, Message, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import EmbedSchemaParser from "../../utils/EmbedSchemaParser";
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

        if (!content && message instanceof Message && message.attachments.size === 0) {
            await this.error(message, "Please provide the message content or attachments!");
            return;
        }

        try {
            if (user) {
                await EmbedSchemaParser.sendMessage(user, {
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
                });
            }

            if (message instanceof Message) {
                await message.react(this.emoji("check"));
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
    }
}
