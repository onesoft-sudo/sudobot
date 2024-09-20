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
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { ArgumentDefaultRules } from "@main/utils/ArgumentDefaultRules";
import { ErrorMessages } from "@main/utils/ErrorMessages";

type InfractionReasonCommandArgs = {
    id: number;
    reason: string;
};

@ArgumentSchema({
    overloads: [
        {
            definitions: [
                {
                    names: ["id"],
                    types: [IntegerArgument],
                    optional: false,
                    errorMessages: [
                        {
                            [ErrorType.InvalidType]: "Invalid infraction ID provided.",
                            [ErrorType.Required]: "Infraction ID is required."
                        }
                    ],
                    interactionName: "id",
                    interactionType: IntegerArgument
                },
                {
                    names: ["reason"],
                    types: [RestStringArgument],
                    optional: false,
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
class InfractionReasonCommand extends Command {
    public override readonly name = "infraction::reason";
    public override readonly description: string = "Update the reason of an infraction.";
    public override readonly permissions = [
        PermissionFlags.ManageMessages,
        PermissionFlags.ViewAuditLog
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly usage = ["<id: number> <reason: string>"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionReasonCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const { id, reason } = args;
        const isSuccess = await this.infractionManager.updateReasonById(
            context.guildId,
            id,
            reason,
            !context.isChatInput() || context.options.getBoolean("notify") !== false
        );

        if (!isSuccess) {
            await context.error("No infraction found with that ID.");
            return;
        }

        await context.success(`Reason of infraction with ID **${id}** has been updated.`);
    }
}

export default InfractionReasonCommand;
