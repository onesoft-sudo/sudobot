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
import { EmbedBuilder, Message, PartialMessage, PermissionsBitField, Snowflake } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";
import { isTextableChannel } from "../../utils/utils";

interface MessageInfo<T extends boolean = false> extends Message<T> {
    deletedAt?: Date;
}

export default class SnipeCommand extends Command implements HasEventListeners {
    public readonly name = "snipe";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.Integer],
            optional: true,
            errors: {
                "type:invalid": "You must provide a valid message index/number between 1-10!",
                "number:range": "You must provide a valid message index/number between 1-10!"
            },
            number: {
                max: 11,
                min: 1
            },
            default: null,
            name: "index"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly argumentSyntaxes = ["[index=1]"];
    public readonly aliases = ["clearsnipe", "cs", "delsnipe", "csnipe", "s", "ces", "ceditsnipe", "es", "editsnipe", "esnipe"];
    public readonly since: string = "4.4.0";
    protected readonly lastDeletedMessages = new Map<Snowflake, Array<MessageInfo<boolean>>>();
    protected readonly lastEditedMessages = new Map<Snowflake, Array<[MessageInfo<boolean>, MessageInfo<boolean>]>>();

    public readonly description = "Reposts the last deleted/edited message.";

    @GatewayEventListener("messageDelete")
    onMessageDelete(message: Message<boolean> | PartialMessage) {
        if (message.author?.bot || !message.content || !isTextableChannel(message.channel)) {
            return;
        }

        const deletedMessages = this.lastDeletedMessages.get(message.guildId!);

        if (deletedMessages === undefined) {
            this.lastDeletedMessages.set(message.guildId!, [{ ...message, deletedAt: new Date() } as MessageInfo]);
        } else {
            if (deletedMessages.length > 10) deletedMessages.pop();
            deletedMessages.unshift({ ...message, deletedAt: new Date() } as MessageInfo);
        }
    }

    @GatewayEventListener("messageUpdate")
    onMessageUpdate(oldMessage: Message<boolean> | PartialMessage, newMessage: Message<boolean> | PartialMessage) {
        if (
            newMessage.author?.bot ||
            !newMessage.content ||
            !isTextableChannel(newMessage.channel) ||
            oldMessage.content === newMessage.content
        ) {
            return;
        }

        const editedMessages = this.lastEditedMessages.get(newMessage.guildId!);

        if (editedMessages === undefined) {
            this.lastEditedMessages.set(newMessage.guildId!, [[oldMessage as MessageInfo, newMessage as MessageInfo]]);
        } else {
            if (editedMessages.length > 10) editedMessages.pop();
            editedMessages.unshift([oldMessage as MessageInfo, newMessage as MessageInfo]);
        }
    }

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const index = context.isLegacy ? (context.parsedNamedArgs.index ?? 1) - 1 : 0;
        const editSnipe = context.isLegacy && ["es", "editsnipe", "esnipe", "ces", "ceditsnipe"].includes(context.argv[0]);
        const messages = (editSnipe ? this.lastEditedMessages : this.lastDeletedMessages).get(message.guildId!);
        const lastMessage = editSnipe
            ? (messages?.[index] as [MessageInfo, MessageInfo])?.[1]
            : (messages?.[index] as MessageInfo);

        if (messages?.length && index >= messages?.length) {
            await this.error(
                message,
                `Invalid message index - only ${messages.length} ${editSnipe ? "edited" : "deleted"} message${
                    messages.length === 1 ? " is" : "s are"
                } have been recorded so far.`
            );
            return;
        }

        if (!lastMessage) {
            await this.error(message, `No ${editSnipe ? "edited" : "deleted"} message was recorded yet.`);
            return;
        }

        if (context.isLegacy && ["clearsnipe", "cs", "delsnipe", "csnipe", "ces", "ceditsnipe"].includes(context.argv[0])) {
            const hasValue = context.args[0] !== undefined;

            if (!hasValue) {
                messages?.splice(0, messages.length);
                await this.success(message, "Cleared sniped messages for this server.");
            } else {
                messages?.splice(index, 1);
                await this.success(message, "Removed the given sniped message for this server.");
            }

            return;
        }

        const date = editSnipe ? (messages?.[index] as [Message, Message])[1].editedAt! : lastMessage.deletedAt;

        return {
            __reply: true,
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: lastMessage.author?.username ?? "Unknown",
                        iconURL: lastMessage.author?.displayAvatarURL()
                    },
                    color: Math.floor(Math.random() * 0xffffff),
                    footer: {
                        text: `Sniped${
                            date
                                ? ` • ${editSnipe ? "Edited" : "Deleted"} ${formatDistanceToNowStrict(date, { addSuffix: true })}`
                                : ""
                        } • ${messages?.length ?? 0} ${editSnipe ? "edited" : "deleted"} message${
                            messages?.length === 1 ? "" : "s"
                        } total`
                    },
                    ...(editSnipe
                        ? {
                              fields: [
                                  {
                                      name: "Before",
                                      value: (messages?.[index] as [Message, Message])[0].content || "*No content*"
                                  },
                                  {
                                      name: "After",
                                      value: (messages?.[index] as [Message, Message])[1].content || "*No content*"
                                  }
                              ]
                          }
                        : {
                              description: lastMessage.content!
                          })
                })
            ]
        };
    }
}
