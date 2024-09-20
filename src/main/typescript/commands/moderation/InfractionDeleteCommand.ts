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
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { Infraction } from "@main/models/Infraction";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";

type InfractionDeleteCommandArgs = {
    id: number;
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
                }
            ]
        }
    ]
})
class InfractionDeleteCommand extends Command {
    public override readonly name = "infraction::delete";
    public override readonly description: string = "Delete an infraction.";
    public override readonly permissions = [
        PermissionFlags.ManageMessages,
        PermissionFlags.ViewAuditLog
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly usage = ["<id: number>"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionDeleteCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const infraction: Infraction | undefined = await this.infractionManager.deleteById(
            context.guildId,
            args.id
        );

        if (!infraction) {
            await context.error("No infraction found with that ID.");
            return;
        }

        await context.success(`Infraction with ID **${infraction.id}** has been deleted.`);
    }
}

export default InfractionDeleteCommand;
