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
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument";
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
import { APIEmbed, GuildMember } from "discord.js";

type SendCommandArgs = {
    content: string;
    member: GuildMember;
};

@ArgumentSchema.Definition({
    names: ["member"],
    types: [GuildMemberArgument<true>],
    optional: false,
    errorMessages: [
        {
            ...GuildMemberArgument.defaultErrors,
            [ErrorType.Required]: "You must specify a member to perform this action!"
        }
    ],
    interactionName: "member",
    interactionType: GuildMemberArgument<true>
})
@ArgumentSchema.Definition({
    names: ["content"],
    types: [RestStringArgument],
    errorMessages: [
        {
            [ErrorType.Required]: "You must specify a message to send!",
            [ErrorType.InvalidRange]: "The message must be between 1 and 4096 characters long."
        }
    ],
    rules: [
        {
            "range:max": 4096,
            "range:min": 1
        }
    ],
    optional: false,
    interactionName: "content",
    interactionType: RestStringArgument
})
class SendCommand extends Command {
    public override readonly name = "send";
    public override readonly description = "Sends a message to a member.";
    public override readonly detailedDescription =
        "Sends a message to a member. This command is used to send a message to a member directly.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly defer = true;
    public override readonly ephemeral = true;
    public override readonly usage = ["<member: GuildMember> <expression: RestString>"];

    @Inject("configManager")
    protected readonly configManager!: ConfigurationManager;

    @Inject("systemAuditLogging")
    protected readonly systemAuditLogging!: SystemAuditLoggingService;

    @Inject()
    protected readonly directiveParsingService!: DirectiveParsingService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option
                        .setName("member")
                        .setDescription("The member to send the message to.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("content")
                        .setDescription("The message to send.")
                        .setRequired(true)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: SendCommandArgs
    ): Promise<void> {
        const { content, member } = args;

        if (!content) {
            return void context.error("You must specify the content of the message to send!");
        }

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
                await member.send(options);
            } catch {
                return void context.error(
                    "An error occurred while sending the message to the user. Maybe they have DMs turned off or blocked me?"
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

export default SendCommand;
