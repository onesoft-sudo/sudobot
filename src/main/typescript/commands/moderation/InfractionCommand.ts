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

import type { Buildable } from "@framework/commands/Command";
import { Command, type SubcommandMeta } from "@framework/commands/Command";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { InfractionType } from "@main/models/Infraction";

class InfractionCommand extends Command {
    public override readonly name = "infraction";
    public override readonly description: string = "Manage infractions.";
    public override readonly detailedDescription: string =
        "Manage infractions for users. This command allows you to view, create, and delete infractions.";
    public override readonly permissions = [
        PermissionFlags.ManageMessages,
        PermissionFlags.ViewAuditLog
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly usage = ["<subcommand: String> [...args: Any[]]"];
    public override readonly aliases = ["inf", "infs", "infractions"];
    public override readonly subcommands = [
        "create",
        "delete",
        "view",
        "reason", // TODO: Add "reason" subcommand
        "list",
        "ls",
        "s",
        "clear",
        "d",
        "duration"
    ];
    public override readonly isolatedSubcommands = true;
    public override readonly subcommandMeta: Record<string, SubcommandMeta> = {
        create: {
            description: "Create a new infraction."
        },
        delete: {
            description: "Delete an infraction."
        },
        view: {
            description: "View an infraction."
        },
        reason: {
            description: "Change the reason for an infraction."
        }
    };

    public override build(): Buildable[] {
        const types = Object.keys(InfractionType).map((key: string) => ({
            name: key
                .split("_")
                .map(s => s[0].toUpperCase() + s.slice(1).toLowerCase())
                .join(" "),
            value: key
        }));

        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("create")
                        .setDescription("Create a new infraction.")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("The target user")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("type")
                                .setDescription("The type of infraction to create")
                                .setChoices(...types)

                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("reason")
                                .setDescription("The reason for the infraction.")
                        )
                        .addStringOption(option =>
                            option
                                .setName("duration")
                                .setDescription(
                                    "The duration of the infraction. This is only kept for record-keeping purposes."
                                )
                        )
                        .addBooleanOption(option =>
                            option
                                .setName("notify")
                                .setDescription(
                                    "Whether to notify the user of the infraction. Defaults to false"
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("delete")
                        .setDescription("Delete an infraction.")
                        .addIntegerOption(option =>
                            option
                                .setName("id")
                                .setDescription("The ID of the infraction to delete.")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("view")
                        .setDescription("View an infraction.")
                        .addIntegerOption(option =>
                            option.setName("id").setDescription("The ID of the infraction to view.")
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("list")
                        .setDescription("List infractions for a user.")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("The target user")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("clear")
                        .setDescription("Clear all infractions of a user.")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("The target user")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("type")
                                .setDescription("The type of infraction to clear.")
                                .setChoices(...types)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("reason")
                        .setDescription("Change the reason for an infraction.")
                        .addIntegerOption(option =>
                            option
                                .setName("id")
                                .setDescription(
                                    "The ID of the infraction to change the reason for."
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName("reason")
                                .setDescription("The new reason for the infraction.")
                        )
                        .addBooleanOption(option =>
                            option
                                .setName("notify")
                                .setDescription(
                                    "Whether to notify the user of the updated reason. Defaults to true."
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("duration")
                        .setDescription("Change the duration of an infraction.")
                        .addIntegerOption(option =>
                            option
                                .setName("id")
                                .setDescription(
                                    "The ID of the infraction to change the duration for."
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName("duration")
                                .setDescription("The new duration for the infraction.")
                        )
                        .addBooleanOption(option =>
                            option
                                .setName("notify")
                                .setDescription(
                                    "Whether to notify the user of the updated duration. Defaults to true."
                                )
                        )
                )
        ];
    }

    public override async execute(): Promise<void> {}
}

export default InfractionCommand;
