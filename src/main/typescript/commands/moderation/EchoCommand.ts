/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import ChannelArgument from "@framework/arguments/ChannelArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { GuildBasedChannel, PermissionFlagsBits } from "discord.js";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type EchoCommandArgs = {
    content: string;
    channel?: GuildBasedChannel;
};

@TakesArgument<EchoCommandArgs>({
    names: ["channel", "content"],
    types: [ChannelArgument<true>, RestStringArgument],
    optional: false,
    errorMessages: [
        {
            ...ChannelArgument.defaultErrors,
            [ErrorType.Required]: "You must specify the content of the message to send!"
        }
    ],
    interactionName: "channel",
    interactionType: ChannelArgument<true>
})
@TakesArgument<EchoCommandArgs>({
    names: ["content"],
    types: [RestStringArgument],
    optional: true,
    interactionName: "content",
    interactionType: RestStringArgument
})
class EchoCommand extends Command {
    public override readonly name = "echo";
    public override readonly description = "Echoes a message to a channel.";
    public override readonly detailedDescription =
        "Echoes a message to a channel. If no channel is specified, the message will be sent in the current channel.";
    public override readonly permissions = [PermissionFlagsBits.ManageMessages];
    public override readonly defer = true;
    public override readonly usage = [
        "[expression: RestString]",
        "<channel: TextBasedChannel> [expression: RestString]"
    ];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("content")
                        .setDescription("The message to send.")
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("The channel to send the message to.")
                        .setRequired(false)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: EchoCommandArgs
    ): Promise<void> {
        const { content, channel } = args;

        console.log(channel?.id, content);

        if (channel && !channel.isTextBased()) {
            return void context.error("You can only send messages to text channels.");
        }

        if (!content) {
            return void context.error("You must specify the content of the message to send!");
        }

        const finalChannel = channel ?? context.channel;
        await finalChannel.send(content);
    }
}

export default EchoCommand;
