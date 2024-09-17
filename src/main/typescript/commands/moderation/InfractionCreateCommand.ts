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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import StringArgument from "@framework/arguments/StringArgument";
import UserArgument from "@framework/arguments/UserArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import InfractionViewCommand from "@main/commands/moderation/InfractionViewCommand";
import { Infraction, InfractionType } from "@main/models/Infraction";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { ErrorMessages } from "@main/utils/ErrorMessages";
import { User } from "discord.js";

type InfractionCreateCommandArgs = {
    user: User;
    type: string;
    reason?: string;
};

@ArgumentSchema({
    overloads: [
        {
            definitions: [
                {
                    names: ["user"],
                    types: [UserArgument<true>],
                    optional: false,
                    errorMessages: [UserArgument.defaultErrors],
                    interactionName: "user",
                    interactionType: UserArgument<true>
                },
                {
                    names: ["type"],
                    types: [StringArgument],
                    optional: false,
                    errorMessages: [
                        {
                            [ErrorType.InvalidType]: "Invalid infraction type provided.",
                            [ErrorType.Required]: "Infraction type is required."
                        }
                    ],
                    interactionName: "type",
                    interactionType: StringArgument
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
class InfractionCreateCommand extends Command {
    public override readonly name = "infraction::create";
    public override readonly description: string = "Create a new infraction.";
    public override readonly permissions = [
        PermissionFlags.ManageMessages,
        PermissionFlags.ViewAuditLog
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly usage = ["<user: User> <type: InfractionType> [reason: string]"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionCreateCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const { type: rawType, user, reason } = args;
        const type = rawType.toUpperCase();

        if (!Object.values(InfractionType).includes(type as InfractionType)) {
            await context.error("Invalid infraction type provided.");
            return;
        }

        const durationString = context.isChatInput()
            ? context.options.getString("duration")
            : undefined;
        const duration = durationString
            ? Duration.fromDurationStringExpression(durationString)
            : undefined;
        const notify = context.isChatInput() && !!context.options.getBoolean("notify");

        const infraction: Infraction = await this.infractionManager.createInfraction({
            type: type as InfractionType,
            user,
            guildId: context.guild.id,
            moderator: context.user,
            reason,
            notify,
            generateOverviewEmbed: false,
            processReason: true,
            sendLog: false,
            payload: {
                expiresAt: duration?.fromNow(),
                metadata: duration
                    ? {
                          duration: duration?.fromNowMilliseconds()
                      }
                    : undefined
            }
        });

        await context.reply({
            embeds: [InfractionViewCommand.buildEmbed(infraction, user, context.user, "Created")]
        });
    }
}

export default InfractionCreateCommand;
