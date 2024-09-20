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
import RestStringArgument from "@framework/arguments/RestStringArgument";
import UserArgument from "@framework/arguments/UserArgument";
import { Buildable, Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { ErrorMessages } from "@main/utils/ErrorMessages";
import { PermissionFlagsBits, User } from "discord.js";
import { Limits } from "../../constants/Limits";
import InfractionManager from "../../services/InfractionManager";
import PermissionManagerService from "../../services/PermissionManagerService";

type UnbanCommandArgs = {
    user: User;
    reason?: string;
};

@ArgumentSchema.Definition({
    names: ["user"],
    types: [UserArgument<true>],
    optional: false,
    rules: [
        {
            "interaction:no_required_check": true
        }
    ],
    errorMessages: [UserArgument.defaultErrors],
    interactionName: "user"
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
class UnbanCommand extends Command {
    public override readonly name = "unban";
    public override readonly description = "Unbans a user.";
    public override readonly detailedDescription = "Removes the ban for the given user, if any.";
    public override readonly permissions = [PermissionFlags.BanMembers];
    public override readonly defer = true;
    public override readonly usage = ["<user: User> [reason: RestString]"];
    public override readonly systemPermissions = [PermissionFlagsBits.BanMembers];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addUserOption(option =>
                    option.setName("user").setDescription("The user to unban.").setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("reason")
                        .setDescription("The reason for the unban.")
                        .setMaxLength(Limits.Reason)
                )
        ];
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: UnbanCommandArgs
    ): Promise<void> {
        const { user, reason } = args;

        const result = await this.infractionManager.createUnban({
            guildId: context.guildId,
            moderator: context.user,
            reason,
            user,
            generateOverviewEmbed: true
        });
        const { overviewEmbed, status } = result;

        if (status === "failed") {
            if (result.errorType === "unknown_ban") {
                await context.error("That user is not banned!");
                return;
            }

            await context.error(
                result.errorDescription ??
                    `Failed to unban the user. Maybe I don't have the permissions to do so. Error code: ${result.errorType ?? "unknown"}`
            );

            return;
        }

        await context.reply({
            embeds: [overviewEmbed]
        });
    }
}

export default UnbanCommand;
