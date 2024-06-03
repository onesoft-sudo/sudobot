import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";

class SnippetCommand extends Command {
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
    public override readonly subcommands = ["add", "create"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addSubcommand(subcommand =>
                subcommand
                    .setName("add")
                    .setDescription("Add a snippet.")
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
        ];
    }

    public override async execute(): Promise<void> {}
}

export default SnippetCommand;
