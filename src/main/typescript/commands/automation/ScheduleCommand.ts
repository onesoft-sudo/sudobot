/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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
import DurationArgument from "@framework/arguments/DurationArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import MessageScheduleQueue from "@main/queues/MessageScheduleQueue";
import ConfigurationManager from "@main/services/ConfigurationManager";
import DirectiveParsingService from "@main/services/DirectiveParsingService";
import QueueService from "@main/services/QueueService";
import SystemAuditLoggingService from "@main/services/SystemAuditLoggingService";
import { TextChannel } from "discord.js";

type ScheduleCommandArgs = {
    content: string;
    time: Duration;
};

@ArgumentSchema.Definition({
    names: ["time"],
    types: [DurationArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "The time must be a valid duration.",
            [ErrorType.Required]:
                "You must specify the time after which the message should be sent."
        }
    ]
})
@ArgumentSchema.Definition({
    names: ["content"],
    types: [RestStringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidRange]: "The message must be between 1 and 4096 characters long.",
            [ErrorType.Required]: "You must specify the content of the message."
        }
    ],
    rules: [
        {
            "range:max": 4096,
            "range:min": 1
        }
    ],
    interactionName: "content",
    interactionType: RestStringArgument
})
class ScheduleCommand extends Command {
    public override readonly name = "schedule";
    public override readonly description: string = "Sends a message after a specified time.";
    public override readonly defer = true;
    public override readonly usage = ["<delay: Duration> <...content: RestString>"];
    public override readonly systemPermissions = [];
    public override permissions = [PermissionFlags.ManageMessages];

    @Inject()
    protected readonly directiveParsingService!: DirectiveParsingService;

    @Inject()
    protected readonly configManager!: ConfigurationManager;

    @Inject()
    protected readonly systemAuditLogging!: SystemAuditLoggingService;

    @Inject()
    protected readonly queueService!: QueueService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("content")
                        .setDescription("The message content")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("time")
                        .setDescription("Specify the time after the bot should send the message")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("delete_after")
                        .setDescription(
                            "Specify the time after the bot should delete the message. Relative to the time the message is sent."
                        )
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription(
                            "The channel where the message will be sent, defaults to the current channel"
                        )
                )
        ];
    }

    public override async execute(context: Context, args: ScheduleCommandArgs): Promise<void> {
        const { content, time } = args;
        const channel =
            (context.isChatInput()
                ? (context.options.getChannel("channel") as TextChannel)
                : null) ?? context.channel;

        if (channel && !channel.isTextBased()) {
            return void context.error("You can only send messages to text channels.");
        }

        if (!content) {
            return void context.error("You must specify the content of the message to send!");
        }

        const deleteAfterString = context.isChatInput()
            ? context.options.getString("delete_after")
            : undefined;
        let deleteAfter: Duration | undefined;

        if (deleteAfterString) {
            try {
                deleteAfter = Duration.fromDurationStringExpression(deleteAfterString);
            } catch (error) {
                this.application.logger.error(error);
                return void context.error(
                    "You must specify a valid time interval for the delete_after option."
                );
            }
        }

        this.queueService
            .create(MessageScheduleQueue, {
                data: {
                    channelId: channel.id,
                    content,
                    deleteAfter: deleteAfter?.toMilliseconds(),
                    guildId: context.guild.id,
                    mentionEveryone:
                        this.configManager.config[context.guildId]?.echoing?.allow_mentions !==
                            false || !!context.member?.permissions?.has("MentionEveryone", true)
                },
                guildId: context.guild.id,
                runsAt: time.fromNow()
            })
            .schedule()
            .catch(this.application.logger.error);

        if (context.isLegacy()) {
            await context.commandMessage.react(context.emoji("check")?.toString() || "✅");
        } else {
            await context.success("Message scheduled successfully.");
        }
    }
}

export default ScheduleCommand;
