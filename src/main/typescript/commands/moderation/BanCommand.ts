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
import UserArgument from "@framework/arguments/UserArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import DurationParseError from "@framework/datetime/DurationParseError";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { fetchMember } from "@framework/utils/entities";
import { also } from "@framework/utils/utils";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { ErrorMessages } from "@main/utils/ErrorMessages";
import { GuildMember, PermissionFlagsBits, User } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type BanCommandArgs = {
    member?: GuildMember;
    reason?: string;
    duration?: Duration;
    user: User;
};

@ArgumentSchema({
    overloads: [
        {
            definitions: [
                {
                    names: ["member", "user"],
                    types: [GuildMemberArgument<true>, UserArgument<true>],
                    optional: false,
                    rules: [
                        {
                            "interaction:no_required_check": true
                        }
                    ],
                    errorMessages: [GuildMemberArgument.defaultErrors, UserArgument.defaultErrors],
                    interactionName: "user"
                },
                {
                    names: ["duration", "reason"],
                    types: [DurationArgument, RestStringArgument],
                    optional: true,
                    errorMessages: [
                        {
                            [ErrorType.InvalidType]: "Invalid reason or duration provided."
                        },
                        {
                            [ErrorType.InvalidRange]: `The reason must be between 1 and ${Limits.Reason} characters long.`,
                            [ErrorType.InvalidType]: "Invalid reason or duration provided."
                        }
                    ],
                    rules: [{}, ArgumentDefaultRules.Reason],
                    interactionName: "duration",
                    interactionType: DurationArgument,
                    interactionRuleIndex: 0
                },
                {
                    names: ["reason"],
                    types: [RestStringArgument],
                    optional: true,
                    errorMessages: [ErrorMessages.Reason],
                    rules: [ArgumentDefaultRules.Reason],
                    interactionRuleIndex: 0,
                    interactionName: "reason",
                    interactionType: RestStringArgument
                }
            ]
        }
    ]
})
class BanCommand extends Command {
    public override readonly name = "ban";
    public override readonly description = "Bans a user.";
    public override readonly detailedDescription =
        "Bans a user from the server.\n:warning: The aliases of this command behave differently.\n\n* `ban` - Bans a user normally.\n* `cleanban` - Bans a user and deletes their messages from the past 7 days.\n* `tempban` - Temporarily bans a user.\n* `softban` - Bans and immediately unbans a user, deleting their messages.";
    public override readonly permissions = [PermissionFlags.BanMembers];
    public override readonly defer = true;
    public override readonly usage = [
        "<user: User> [reason: RestString]",
        "<user: User> <duration: Duration> [reason: RestString]"
    ];
    public override readonly systemPermissions = [PermissionFlagsBits.BanMembers];
    public override readonly aliases = ["cleanban", "tempban", "softban"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option.setName("user").setDescription("The user to ban.").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the ban.")
                        .setMaxLength(Limits.Reason)
                )
                .addStringOption(option =>
                    option
                        .setName("duration")
                        .setDescription("The duration of the ban.")
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName("deletion_timeframe")
                        .setDescription("The message deletion timeframe. Defaults to none.")
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName("notify")
                        .setDescription("Whether to notify the user. Defaults to true.")
                        .setRequired(false)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: BanCommandArgs
    ): Promise<void> {
        const { reason, user } = args;
        let { member } = args;

        if (!context.isLegacy()) {
            if (!member) {
                const fetchedMember = await fetchMember(context.guild, user.id);

                if (fetchedMember) {
                    member = fetchedMember;
                }
            }
        }

        if (member) {
            if (
                !member.bannable ||
                !context.member ||
                !(await this.permissionManager.canModerate(member, context.member))
            ) {
                await context.error("You don't have permission to ban this user.");
                return;
            }
        }

        if (context.commandName === "tempban" && !args.duration) {
            await context.error("You must provide a valid duration for a temporary ban.");
            return;
        }

        if (context.commandName === "softban" && args.duration) {
            await context.error("You cannot provide a duration for a softban.");
            return;
        }

        const deletionTimeframeString = context.isChatInput()
            ? (context.options.getString("deletion_timeframe") ?? undefined)
            : undefined;
        let deletionTimeframe: Duration | undefined;

        try {
            deletionTimeframe = deletionTimeframeString
                ? Duration.fromDurationStringExpression(deletionTimeframeString)
                : context.isLegacy()
                  ? context.commandName === "cleanban"
                      ? new Duration({ days: 7 })
                      : undefined
                  : undefined;
        } catch (error) {
            if (error instanceof DurationParseError) {
                await context.error("Invalid deletion timeframe provided.");
                return;
            }

            throw error;
        }

        const deletionTimeframeMs = deletionTimeframe?.toMilliseconds();

        if (
            deletionTimeframeMs !== undefined &&
            (deletionTimeframeMs < 0 || deletionTimeframeMs > 1000 * 60 * 60 * 24 * 7)
        ) {
            await context.error("Deletion timeframe must be between 0 and 7 days.");
            return;
        }

        const result = await this.infractionManager.createBan({
            guildId: context.guildId,
            moderator: context.user,
            reason,
            user: member?.user ?? user,
            generateOverviewEmbed: true,
            duration: args.duration,
            deletionTimeframe,
            notify: !context.isChatInput() || context.options.getBoolean("notify") !== false,
            immediateUnban: context.commandName === "softban"
        });

        if (result.status === "failed") {
            await context.error(
                result.errorType === "api_error_unban" && result.errorDescription
                    ? `Error while removing the created ban: ${result.errorDescription}`
                    : (result.errorDescription ??
                          "Failed to ban user. Maybe I don't have the permissions to do so.")
            );

            return;
        }

        await context.reply({
            embeds: [
                also(
                    result.overviewEmbed,
                    embed =>
                        void embed.fields?.push({
                            name: "Message Deletion Timeframe",
                            value: deletionTimeframe?.toString() ?? "N/A"
                        })
                )
            ]
        });
    }
}

export default BanCommand;
