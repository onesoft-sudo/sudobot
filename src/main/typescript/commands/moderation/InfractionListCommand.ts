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
import UserArgument from "@framework/arguments/UserArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Pagination from "@framework/pagination/Pagination";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { Colors } from "@main/constants/Colors";
import { Infraction } from "@main/models/Infraction";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { italic, time, User } from "discord.js";

type InfractionListCommandArgs = {
    user: User;
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
                }
            ]
        }
    ]
})
class InfractionListCommand extends Command {
    public override readonly name = "infraction::list";
    public override readonly description: string = "List infractions for a user.";
    public override readonly aliases = ["infraction::ls", "infraction::s"];
    public override readonly permissions = [
        PermissionFlags.ManageMessages,
        PermissionFlags.ViewAuditLog
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly usage = ["<user: User>"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionListCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const infractions: Infraction[] = await this.infractionManager.getUserInfractions(
            context.guildId,
            args.user.id
        );

        if (infractions.length === 0) {
            await context.error("No infraction found for that user.");
            return;
        }

        const pagination: Pagination<Infraction> = Pagination.withData(infractions)
            .setLimit(5)
            .setMaxTimeout(Pagination.DEFAULT_TIMEOUT)
            .setMessageOptionsBuilder(({ data, maxPages, page }) => {
                let description = "";

                for (const infraction of data) {
                    description += `### Infraction #${infraction.id}\n`;
                    description += `**Type:** ${this.infractionManager.prettifyInfractionType(infraction.type)}\n`;
                    description += `**Moderator:** ${infraction.moderatorId ? (infraction.moderatorId === "0" ? "[Unknown]" : `<@${infraction.moderatorId}> (${infraction.moderatorId})`) : italic("Unknown")}\n`;
                    description += `**Reason:**\n${infraction.reason ? infraction.reason.slice(0, 150) + (infraction.reason.length > 150 ? "\n..." : "") : italic("No reason provided")}\n`;
                    description += `**Created at:** ${time(infraction.createdAt)}\n\n`;
                }

                return {
                    embeds: [
                        {
                            author: {
                                name: `Infractions for ${args.user.username}`,
                                icon_url: args.user.displayAvatarURL()
                            },
                            color: Colors.Primary,
                            description,
                            footer: {
                                text: `Page ${page} of ${maxPages} • ${infractions.length} infractions total`
                            }
                        }
                    ]
                };
            });

        const reply = await context.reply(await pagination.getMessageOptions());
        pagination.setInitialMessage(reply);
    }
}

export default InfractionListCommand;
