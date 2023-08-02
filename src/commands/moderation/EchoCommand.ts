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

import { AttachmentPayload, Channel, GuildChannel, Message, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { isTextableChannel } from "../../utils/utils";

export default class EchoCommand extends Command {
    public readonly name = "echo";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.Channel, ArgumentType.StringRest],
            name: "channelOrContent",
            entityNotNull: true,
            entityNotNullErrorMessage: "This channel does not exist!",
            requiredErrorMessage: "Please provide the message content!"
        },
        {
            types: [ArgumentType.StringRest],
            name: "content",
            requiredErrorMessage: "Please provide the message content!",
            optional: true
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly aliases = ["e", "say"];

    public readonly description = "Make the bot say something.";
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option => option.setName("content").setDescription("Message content").setRequired(true))
        .addChannelOption(option => option.setName("channel").setDescription("The channel where the message will be sent"));

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message, {
            ephemeral: true
        });

        const channel =
            (!context.isLegacy
                ? context.options.getChannel("channel")
                : context.parsedNamedArgs.channelOrContent && typeof context.parsedNamedArgs.channelOrContent === "object"
                ? context.parsedNamedArgs.channelOrContent
                : undefined) ?? message.channel;

        if (channel instanceof GuildChannel && !isTextableChannel(channel as Channel)) {
            await this.error(message, "Please provide a text channel!");
            return;
        }

        const content: string | undefined =
            (!context.isLegacy
                ? context.options.getString("content", true)
                : typeof context.parsedNamedArgs.channelOrContent === "string"
                ? context.parsedNamedArgs.channelOrContent
                : context.parsedNamedArgs.content) ?? undefined;

        if (!content && message instanceof Message && message.attachments.size === 0) {
            await this.error(message, "Please provide the message content or attachments!");
            return;
        }

        await channel?.send({
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

        if (message instanceof Message) {
            await message.react(this.emoji("check"));
        } else {
            await this.deferredReply(message, `Message sent.`);
        }
    }
}
