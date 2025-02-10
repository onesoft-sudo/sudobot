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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import { Command } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { isTextBasedChannel } from "@main/utils/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { EmbedBuilder, type Message, type PartialMessage, type Snowflake } from "discord.js";

interface MessageInfo<T extends boolean = false> extends Message<T> {
    deletedAt?: Date;
}

type SnipeCommandArgs = {
    index?: number;
};

@ArgumentSchema.Definition({
    names: ["index"],
    types: [IntegerArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "You must provide a valid message index/number between 1-10!",
            [ErrorType.InvalidRange]: "You must provide a valid message index/number between 1-10!"
        }
    ],
    rules: [
        {
            "range:min": 1,
            "range:max": 11
        }
    ],
    interactionRuleIndex: 0,
    interactionName: "index",
    interactionType: IntegerArgument
})
class SnipeCommand extends Command implements HasEventListeners {
    public override readonly name = "snipe";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly usage = ["[index=1]"];
    public override readonly aliases = [
        "clearsnipe",
        "cs",
        "delsnipe",
        "csnipe",
        "s",
        "ces",
        "ceditsnipe",
        "es",
        "editsnipe",
        "esnipe"
    ];
    public override readonly since: string = "4.4.0";
    protected readonly lastDeletedMessages = new Map<Snowflake, Array<MessageInfo<boolean>>>();
    protected readonly lastEditedMessages = new Map<
        Snowflake,
        Array<[MessageInfo<boolean>, MessageInfo<boolean>]>
    >();

    public readonly description = "Reposts the last deleted/edited message.";

    @GatewayEventListener("messageDelete")
    public onMessageDelete(message: Message<boolean> | PartialMessage) {
        if (message.author?.bot || !message.content || !isTextBasedChannel(message.channel)) {
            return;
        }

        const deletedMessages = this.lastDeletedMessages.get(message.guildId!);

        if (deletedMessages === undefined) {
            this.lastDeletedMessages.set(message.guildId!, [
                { ...message, deletedAt: new Date() } as MessageInfo
            ]);
        } else {
            if (deletedMessages.length > 10) deletedMessages.pop();
            deletedMessages.unshift({ ...message, deletedAt: new Date() } as MessageInfo);
        }
    }

    @GatewayEventListener("messageUpdate")
    public onMessageUpdate(
        oldMessage: Message<boolean> | PartialMessage,
        newMessage: Message<boolean> | PartialMessage
    ) {
        if (
            newMessage.author?.bot ||
            !newMessage.content ||
            !isTextBasedChannel(newMessage.channel) ||
            oldMessage.content === newMessage.content
        ) {
            return;
        }

        const editedMessages = this.lastEditedMessages.get(newMessage.guildId!);

        if (editedMessages === undefined) {
            this.lastEditedMessages.set(newMessage.guildId!, [
                [oldMessage as MessageInfo, newMessage as MessageInfo]
            ]);
        } else {
            if (editedMessages.length > 10) editedMessages.pop();
            editedMessages.unshift([oldMessage as MessageInfo, newMessage as MessageInfo]);
        }
    }

    public override async execute(context: Context, args: SnipeCommandArgs) {
        const index = args.index ? args.index - 1 : 0;
        const editSnipe =
            context.isLegacy() &&
            ["es", "editsnipe", "esnipe", "ces", "ceditsnipe"].includes(context.argv[0]);
        const messages = (editSnipe ? this.lastEditedMessages : this.lastDeletedMessages).get(
            context.guildId
        );
        const lastMessage = editSnipe
            ? (messages?.[index] as [MessageInfo, MessageInfo])?.[1]
            : (messages?.[index] as MessageInfo);

        if (messages?.length && index >= messages?.length) {
            await context.error(
                `Invalid message index - only ${messages.length} ${editSnipe ? "edited" : "deleted"} message${
                    messages.length === 1 ? " is" : "s are"
                } have been recorded so far.`
            );
            return;
        }

        if (!lastMessage) {
            await context.error(`No ${editSnipe ? "edited" : "deleted"} message was recorded yet.`);
            return;
        }

        if (
            context.isLegacy() &&
            ["clearsnipe", "cs", "delsnipe", "csnipe", "ces", "ceditsnipe"].includes(
                context.argv[0]
            )
        ) {
            const hasValue = context.args[0] !== undefined;

            if (!hasValue) {
                messages?.splice(0, messages.length);
                await context.success("Cleared sniped messages for this server.");
            } else {
                messages?.splice(index, 1);
                await context.success("Removed the given sniped message for this server.");
            }

            return;
        }

        const date = editSnipe
            ? (messages?.[index] as [Message, Message])[1].editedAt!
            : lastMessage.deletedAt;

        await context.replyEmbed(
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
                                  value:
                                      (messages?.[index] as [Message, Message])[0].content ||
                                      "*No content*"
                              },
                              {
                                  name: "After",
                                  value:
                                      (messages?.[index] as [Message, Message])[1].content ||
                                      "*No content*"
                              }
                          ]
                      }
                    : {
                          description: lastMessage.content
                      })
            })
        );
    }
}

export default SnipeCommand;
