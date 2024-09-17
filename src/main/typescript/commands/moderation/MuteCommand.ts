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
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { ErrorMessages } from "@main/utils/ErrorMessages";
import { GuildMember } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type MuteCommandArgs = {
    member: GuildMember;
    reason?: string;
    duration?: Duration;
};

@ArgumentSchema.Definition({
    names: ["member"],
    types: [GuildMemberArgument<true>],
    optional: false,
    rules: [
        {
            "interaction:no_required_check": true
        }
    ],
    errorMessages: [
        {
            [ErrorType.EntityNotFound]: "The user you provided was not found.",
            [ErrorType.InvalidType]: "Invalid user provided.",
            [ErrorType.Required]: "You must provide a user to mute."
        }
    ],
    interactionName: "member"
})
@ArgumentSchema.Definition({
    names: ["duration", "reason"],
    types: [DurationArgument, RestStringArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid reason or duration provided."
        },
        {
            [ErrorType.InvalidType]: "Invalid reason or duration provided.",
            [ErrorType.InvalidRange]: `The reason must be between 1 and ${Limits.Reason} characters long.`
        }
    ],
    rules: [{}, ArgumentDefaultRules.Reason],
    interactionRuleIndex: 0,
    interactionName: "duration",
    interactionType: DurationArgument
})
@ArgumentSchema.Definition({
    names: ["reason"],
    types: [RestStringArgument],
    optional: true,
    errorMessages: [ErrorMessages.Reason],
    rules: [ArgumentDefaultRules.Reason],
    interactionRuleIndex: 0,
    interactionName: "reason",
    interactionType: RestStringArgument
})
class MuteCommand extends Command {
    public override readonly name = "mute";
    public override readonly description = "Mutes a user.";
    public override readonly detailedDescription =
        "Mutes a user and prevents them from talking, while still allowing them in the server.";
    public override readonly permissions = [PermissionFlags.ModerateMembers];
    public override readonly defer = true;
    public override readonly usage = [
        "<member: GuildMember> [reason: RestString]",
        "<member: GuildMember> <duration: Duration> [reason: RestString]"
    ];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option.setName("member").setDescription("The member to mute.").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the mute.")
                        .setMaxLength(Limits.Reason)
                )
                .addStringOption(option =>
                    option.setName("duration").setDescription("The duration of the mute.")
                )
                .addBooleanOption(option =>
                    option
                        .setName("notify")
                        .setDescription("Whether to notify the user. Defaults to true.")
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("role_takeout")
                        .setDescription(
                            "Whether to take away all roles from the user. Defaults to false."
                        )
                        .setRequired(false)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: MuteCommandArgs
    ): Promise<void> {
        const { member, reason, duration } = args;

        if (
            !context.member ||
            !(await this.permissionManager.canModerate(member, context.member))
        ) {
            await context.error("You don't have permission to mute this user!");
            return;
        }

        const result = await this.infractionManager.createMute({
            guildId: context.guildId,
            moderator: context.user,
            reason,
            member,
            generateOverviewEmbed: true,
            duration,
            notify: !context.isChatInput() || context.options.getBoolean("notify") !== false,
            roleTakeout:
                context.isChatInput() && context.options.getBoolean("role_takeout") === true
        });
        const { overviewEmbed, status } = result;

        if (status === "failed") {
            this.application.logger.debug(result);

            await context.error(
                result.errorDescription ??
                    "Failed to mute the user. Maybe I don't have the permissions to do so."
            );

            return;
        }

        await context.reply({
            embeds: [overviewEmbed]
        });
    }
}

export default MuteCommand;
