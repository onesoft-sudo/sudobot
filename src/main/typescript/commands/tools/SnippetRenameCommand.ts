import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import SnippetManagerService from "@main/services/SnippetManagerService";

type SnippetRenameCommandArgs = {
    name: string;
    newName: string;
};

@TakesArgument<SnippetRenameCommandArgs>({
    names: ["name"],
    types: [StringArgument],
    optional: false,
    rules: [
        {
            "range:max": 100
        }
    ],
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide a name of the snippet.",
            [ErrorType.InvalidRange]:
                "The name of the snippet must be between 1 and 100 characters."
        }
    ]
})
@TakesArgument<SnippetRenameCommandArgs>({
    names: ["newName"],
    types: [StringArgument],
    optional: false,
    rules: [
        {
            "range:max": 100
        }
    ],
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide a new name for the snippet.",
            [ErrorType.InvalidRange]:
                "The name of the snippet must be between 1 and 100 characters."
        }
    ],
    interactionName: "new_name"
})
class SnippetRenameCommand extends Command {
    public override readonly name = "snippet::rename";
    public override readonly description: string = "Renames a snippet.";
    public override readonly defer = true;
    public override readonly usage = ["<name: String> <...content: RestString>"];
    public override readonly aliases = ["snippet::mv"];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.BanMembers
    ];
    public override readonly permissionCheckingMode = "or";

    @Inject()
    private readonly snippetManagerService!: SnippetManagerService;

    public override async execute(context: Context, args: SnippetRenameCommandArgs): Promise<void> {
        if (!this.snippetManagerService.hasSnippet(args.name, context.guildId)) {
            await context.error(`Snippet \`${args.name}\` does not exist.`);
            return;
        }

        if (this.snippetManagerService.hasSnippet(args.newName, context.guildId)) {
            await context.error(`Snippet \`${args.newName}\` already exists.`);
            return;
        }

        await this.snippetManagerService.renameSnippet(args.name, args.newName, context.guildId);
        await context.success(`Snippet \`${args.name}\` has been renamed to \`${args.newName}\`.`);
    }
}

export default SnippetRenameCommand;
