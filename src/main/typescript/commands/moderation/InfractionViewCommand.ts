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
import { userInfo } from "@framework/utils/embeds";
import { fetchUser } from "@framework/utils/entities";
import { Colors } from "@main/constants/Colors";
import { Infraction } from "@main/models/Infraction";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { APIEmbed, italic, time, User } from "discord.js";

type InfractionViewCommandArgs = {
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
class InfractionViewCommand extends Command {
    public override readonly name = "infraction::view";
    public override readonly description: string = "View an infraction.";
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

    public static buildEmbed(
        infraction: Infraction,
        user: User | string,
        moderator: User | string,
        footerText: string
    ) {
        const fields = [
            {
                name: "Type",
                value: infraction.type
                    .split("_")
                    .map(s => s[0].toUpperCase() + s.slice(1).toLowerCase())
                    .join(" ")
            },
            {
                name: "User",
                value: typeof user === "string" ? `ID: ${user}` : userInfo(user),
                inline: true
            },
            {
                name: "Moderator",
                value:
                    typeof moderator === "string"
                        ? moderator === "0"
                            ? "[Unknown]"
                            : `ID: ${moderator}`
                        : userInfo(moderator),
                inline: true
            },
            {
                name: "Reason",
                value: infraction.reason ?? italic("No reason provided")
            },
            {
                name: "Created At",
                value: time(infraction.createdAt, "R"),
                inline: true
            },
            {
                name: "Updated At",
                value: time(infraction.updatedAt, "R"),
                inline: true
            }
        ];

        if (infraction.expiresAt) {
            fields.push({
                name: "Expires At",
                value: time(infraction.expiresAt, "R"),
                inline: true
            });
        }

        fields.push({
            name: "Notification Status",
            value: infraction.deliveryStatus
                .split("_")
                .map(s => s[0].toUpperCase() + s.slice(1).toLowerCase())
                .join(" ")
        });

        return {
            title: `Infraction #${infraction.id}`,
            author:
                typeof user === "object"
                    ? {
                          name: user.username,
                          icon_url: user.displayAvatarURL()
                      }
                    : undefined,
            thumbnail:
                typeof user === "object"
                    ? {
                          url: user.displayAvatarURL()
                      }
                    : undefined,
            fields,
            color: Colors.Primary,
            timestamp: new Date().toISOString(),
            footer: {
                text: footerText
            }
        } as APIEmbed;
    }

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionViewCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const infraction: Infraction | undefined = await this.infractionManager.getById(
            context.guildId!,
            args.id
        );

        if (!infraction) {
            await context.error("No infraction found with that ID.");
            return;
        }

        const user = await fetchUser(this.application.client, infraction.userId);
        const moderator =
            infraction.moderatorId === "0"
                ? null
                : await fetchUser(this.application.client, infraction.moderatorId);

        const embed = InfractionViewCommand.buildEmbed(
            infraction,
            user ?? infraction.userId,
            moderator ?? infraction.moderatorId,
            infraction.id.toString()
        );

        await context.reply({ embeds: [embed] });
    }
}

export default InfractionViewCommand;
