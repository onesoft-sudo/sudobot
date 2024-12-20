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
import ChannelArgument from "@framework/arguments/ChannelArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import DirectiveParsingService from "@main/services/DirectiveParsingService";
import type SystemAuditLoggingService from "@main/services/SystemAuditLoggingService";
import { APIEmbed, GuildBasedChannel } from "discord.js";

type EchoCommandArgs = {
    content?: string;
    channel?: GuildBasedChannel;
};

@ArgumentSchema.Definition({
    names: ["channel", "content"],
    types: [ChannelArgument<true>, RestStringArgument],
    optional: true,
    errorMessages: [
        {
            ...ChannelArgument.defaultErrors,
            [ErrorType.Required]: "You must specify the content of the message to send!"
        },
        {
            [ErrorType.InvalidRange]: "The message must be between 1 and 4096 characters long.",
            [ErrorType.Required]: "You must specify the content of the message to send!"
        }
    ],
    rules: [
        {},
        {
            "range:max": 4096,
            "range:min": 1
        }
    ],
    interactionName: "channel",
    interactionType: ChannelArgument<true>
})
@ArgumentSchema.Definition({
    names: ["content"],
    types: [RestStringArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidRange]: "The message must be between 1 and 4096 characters long."
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
class EchoCommand extends Command {
    public override readonly name = "echo";
    public override readonly description = "Echoes a message to a channel.";
    public override readonly detailedDescription =
        "Echoes a message to a channel. If no channel is specified, the message will be sent in the current channel.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly defer = true;
    public override readonly ephemeral = true;
    public override readonly usage = [
        "[expression: RestString]",
        "<channel: TextBasedChannel> [expression: RestString]"
    ];

    @Inject("configManager")
    protected readonly configManager!: ConfigurationManager;

    @Inject("systemAuditLogging")
    protected readonly systemAuditLogging!: SystemAuditLoggingService;

    @Inject()
    protected readonly directiveParsingService!: DirectiveParsingService;

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
        let { content } = args;
        const { channel } = args;

        if (channel && !channel.isTextBased()) {
            return void context.error("You can only send messages to text channels.");
        }

        if (context.isChatInput()) {
            content = context.options.getString("content", true);
        }

        if (!content) {
            return void context.error("You must specify the content of the message to send!");
        }

        const finalChannel = channel ?? context.channel;
        try {
            const { data, output } = await this.directiveParsingService.parse(content);
            const options = {
                files: context.isLegacy()
                    ? context.commandMessage.attachments.map(a => ({
                          attachment: a.proxyURL,
                          name: a.name
                      }))
                    : [],
                content: output.trim() === "" ? undefined : output,
                embeds: (data.embeds as APIEmbed[]) ?? [],
                allowedMentions:
                    this.configManager.config[context.guildId]?.echoing?.allow_mentions !== false ||
                    context.member?.permissions?.has("MentionEveryone", true)
                        ? undefined
                        : { parse: [], roles: [], users: [] }
            };

            try {
                await finalChannel.send(options);
            } catch {
                return void context.error(
                    "An error occurred while sending the message. Make sure I have the necessary permissions."
                );
            }

            if (context.isChatInput()) {
                await context.success("Message sent successfully.");
            }

            this.systemAuditLogging
                .logEchoCommandExecuted({
                    command: this.name,
                    guild: context.guild,
                    rawCommandContent: content,
                    user: context.user,
                    generatedMessageOptions: options
                })
                .catch(this.application.logger.error);
        } catch (error) {
            return void context.error(
                error instanceof DirectiveParseError
                    ? error.message.replace("Invalid argument: ", "")
                    : "Error parsing the directives in the message content."
            );
        }
    }
}

export default EchoCommand;
