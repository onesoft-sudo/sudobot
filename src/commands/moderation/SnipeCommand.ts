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

import { ChannelType, EmbedBuilder, Message, PartialMessage, PermissionsBitField, Snowflake } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";

export default class SnipeCommand extends Command implements HasEventListeners {
    public readonly name = "snipe";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.Integer],
            optional: true,
            typeErrorMessage: "You must provide a valid message index/number between 1-10!",
            minMaxErrorMessage: "You must provide a valid message index/number between 1-10!",
            maxValue: 11,
            minValue: 1,
            default: null,
            name: "index"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly argumentSyntaxes = ["[index=1]"];
    public readonly aliases = ["clearsnipe", "cs", "delsnipe", "csnipe", "s"];
    public readonly since: string = "4.4.0";
    protected readonly lastDeletedMessages = new Map<Snowflake, Array<Message<boolean> | PartialMessage> | undefined>();

    public readonly description = "Reposts the last deleted message.";

    @GatewayEventListener("messageDelete")
    onMessageDelete(message: Message<boolean> | PartialMessage) {
        if (
            message.author?.bot ||
            !message.content ||
            !message.channel.isTextBased() ||
            message.channel.type === ChannelType.DM
        ) {
            return;
        }

        const deletedMessages = this.lastDeletedMessages.get(message.guildId!);

        if (deletedMessages === undefined) {
            this.lastDeletedMessages.set(message.guildId!, [message]);
        } else {
            if (deletedMessages.length > 10) deletedMessages.pop();
            deletedMessages.unshift(message);
        }
    }

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const index = context.isLegacy ? (context.parsedNamedArgs.index ?? 1) - 1 : 0;
        const lastDeletedMessages = this.lastDeletedMessages.get(message.guildId!);
        const lastDeletedMessage = lastDeletedMessages?.[index];

        if (lastDeletedMessages?.length && index >= lastDeletedMessages?.length) {
            await this.error(
                message,
                `Invalid message index - only ${lastDeletedMessages.length} message${
                    lastDeletedMessages.length === 1 ? " is" : "s are"
                } have been recorded so far.`
            );
            return;
        }

        if (!lastDeletedMessage) {
            await this.error(message, `No deleted message was recorded yet.`);
            return;
        }

        if (context.isLegacy && context.argv[0] !== "s" && context.argv[0] !== "snipe") {
            const hasValue = context.args[0] !== undefined;

            if (!hasValue) {
                lastDeletedMessages.splice(0, lastDeletedMessages.length);
                await this.success(message, "Cleared sniped messages for this server.");
            } else {
                lastDeletedMessages.splice(index, 1);
                await this.success(message, "Removed the given sniped message for this server.");
            }

            return;
        }

        return {
            __reply: true,
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: lastDeletedMessage.author?.username ?? "Unknown",
                        iconURL: lastDeletedMessage.author?.displayAvatarURL()
                    },
                    color: Math.floor(Math.random() * 0xffffff),
                    description: lastDeletedMessage.content!,
                    footer: {
                        text: `Sniped • ${lastDeletedMessages.length ?? 0} message${
                            lastDeletedMessages.length === 1 ? " is" : "s are"
                        } sniped`
                    }
                }).setTimestamp()
            ]
        };
    }
}
