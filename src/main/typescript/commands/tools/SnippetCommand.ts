import AbstractRootCommand from "@framework/commands/AbstractRootCommand";
import type { Buildable } from "@framework/commands/Command";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";

class SnippetCommand extends AbstractRootCommand {
    public override readonly name = "snippet";
    public override readonly description: string = "Manage snippets.";
    public override readonly usage = ["<subcommand: String> [...args: String[]]"];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.BanMembers
    ];
    public override readonly permissionCheckingMode = "or";
    public override readonly isolatedSubcommands = true;
    public override readonly aliases = ["tag", "tags", "snippets"];
    public override readonly subcommands = [
        "add",
        "create",
        "ls",
        "list",
        "delete",
        "remove",
        "rename",
        "mv"
    ];

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("create")
                        .setDescription("Create a snippet.")
                        .addStringOption(option =>
                            option
                                .setName("name")
                                .setDescription("The name of the snippet.")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("content")
                                .setDescription("The content of the snippet.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName("list").setDescription("List all snippets.")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("delete")
                        .setDescription("Delete a snippet.")
                        .addStringOption(option =>
                            option
                                .setName("name")
                                .setDescription("The name of the snippet.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("rename")
                        .setDescription("Rename a snippet.")
                        .addStringOption(option =>
                            option
                                .setName("name")
                                .setDescription("The name of the snippet.")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("new_name")
                                .setDescription("The new name of the snippet.")
                                .setRequired(true)
                        )
                )
        ];
    }
}

export default SnippetCommand;
