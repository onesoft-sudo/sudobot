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
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { GuildMember, PermissionFlagsBits } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type MuteCommandArgs = {
    member: GuildMember;
    reason?: string;
    duration?: number;
};

@TakesArgument<MuteCommandArgs>({
    names: ["member"],
    types: [GuildMemberArgument<true>],
    optional: false,
    rules: {
        "interaction:no_required_check": true
    },
    errorMessages: [
        {
            [ErrorType.EntityNotFound]: "The user you provided was not found.",
            [ErrorType.InvalidType]: "Invalid user provided.",
            [ErrorType.Required]: "You must provide a user to mute."
        }
    ],
    interactionName: "member"
})
@TakesArgument<MuteCommandArgs>({
    names: ["duration", "reason"],
    types: [IntegerArgument, RestStringArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid reason or duration provided."
        }
    ],
    interactionName: "duration",
    interactionType: IntegerArgument
})
@TakesArgument<MuteCommandArgs>({
    names: ["reason"],
    types: [RestStringArgument],
    optional: true,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid reason provided."
        }
    ],
    interactionName: "reason",
    interactionType: RestStringArgument
})
class MuteCommand extends Command {
    public override readonly name = "mute";
    public override readonly description = "Mutes a user.";
    public override readonly detailedDescription =
        "Mutes a user and prevents them from talking, while still allowing them in the server.";
    public override readonly permissions = [PermissionFlagsBits.ModerateMembers];
    public override readonly defer = true;
    public override readonly usage = [
        "<member: GuildMember> [reason: RestString]",
        "<member: GuildMember> <duration: Duration> [reason: RestString]"
    ];
    public override readonly cooldown = 5_000;

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
                .addIntegerOption(option =>
                    option.setName("duration").setDescription("The duration of the mute.")
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
            duration
        });
        const { overviewEmbed, status } = result;

        if (status === "failed") {
            this.application.logger.debug(result);

            if (result.errorType === "already_muted") {
                await context.error("This user is already muted.");
                return;
            }

            await context.error(
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
