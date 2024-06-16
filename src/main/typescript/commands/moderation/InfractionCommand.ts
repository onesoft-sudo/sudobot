import type { Buildable } from "@framework/commands/Command";
import { Command, type SubcommandMeta } from "@framework/commands/Command";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { InfractionType } from "@prisma/client";

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
                .addSubcommand(option =>
                    option
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
                .addSubcommand(option =>
                    option
                        .setName("delete")
                        .setDescription("Delete an infraction.")
                        .addIntegerOption(option =>
                            option
                                .setName("id")
                                .setDescription("The ID of the infraction to delete.")
                        )
                )
                .addSubcommand(option =>
                    option
                        .setName("view")
                        .setDescription("View an infraction.")
                        .addIntegerOption(option =>
                            option.setName("id").setDescription("The ID of the infraction to view.")
                        )
                )
                .addSubcommand(option =>
                    option
                        .setName("list")
                        .setDescription("List infractions for a user.")
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("The target user")
                                .setRequired(true)
                        )
                )
                .addSubcommand(option =>
                    option
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
                .addSubcommand(option =>
                    option
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
                .addSubcommand(option =>
                    option
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
