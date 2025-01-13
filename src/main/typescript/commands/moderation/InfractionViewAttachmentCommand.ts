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
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { Infraction } from "@main/models/Infraction";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";

type InfractionViewAttachmentCommandArgs = {
    id: string;
};

@ArgumentSchema({
    overloads: [
        {
            definitions: [
                {
                    names: ["id"],
                    types: [StringArgument],
                    optional: false,
                    errorMessages: [
                        {
                            [ErrorType.InvalidType]: "Invalid infraction attachment ID provided.",
                            [ErrorType.Required]: "Infraction attachment ID is required."
                        }
                    ],
                    interactionName: "id",
                    interactionType: StringArgument
                }
            ]
        }
    ]
})
class InfractionViewAttachmentCommand extends Command {
    public override readonly name = "infraction::attachment";
    public override readonly description: string =
        "View an attachment associated with an infraction.";
    public override readonly permissions = [
        PermissionFlags.ManageMessages,
        PermissionFlags.ViewAuditLog
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly usage = ["<id: string>"];
    public override readonly aliases = ["infraction::file", "infraction::viewfile"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionViewAttachmentCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const [infractionId, attachmentIndex] = args.id.split("!").map(value => parseInt(value));

        if (Number.isNaN(infractionId) || Number.isNaN(attachmentIndex)) {
            await context.error(
                "Invalid infraction attachment ID provided. Infraction attachment ID must be in the format of `<infractionId>!<attachmentIndex>`."
            );
            return;
        }

        const infraction: Infraction | undefined = await this.infractionManager.getById(
            context.guildId,
            infractionId
        );

        if (!infraction) {
            await context.error("No infraction associated with that attachment ID was found.");
            return;
        }

        const attachment = infraction.attachments[attachmentIndex];

        if (!attachment) {
            await context.error("No infraction attachment found with that ID.");
            return;
        }

        await context.reply({
            content: `**Attachment ID:** ${infractionId}!${attachmentIndex}\n**Infraction ID:** ${infractionId}\n**Attachment Index:** ${attachmentIndex}`,
            files: [
                {
                    name: attachment,
                    attachment: this.infractionManager.getLocalAttachmentPath(attachment)
                }
            ]
        });
    }
}

export default InfractionViewAttachmentCommand;
