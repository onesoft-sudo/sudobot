import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import SnippetManagerService from "@main/services/SnippetManagerService";

type SnippetDeleteCommandArgs = {
    name: string;
};

@ArgumentSchema.Definition({
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
class SnippetDeleteCommand extends Command {
    public override readonly name = "snippet::delete";
    public override readonly description: string = "Deletes a snippet.";
    public override readonly defer = true;
    public override readonly aliases = ["remove"];
    public override readonly usage = ["<name: String>"];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.BanMembers
    ];
    public override readonly permissionCheckingMode = "or";

    @Inject()
    private readonly snippetManagerService!: SnippetManagerService;

    public override async execute(context: Context, args: SnippetDeleteCommandArgs): Promise<void> {
        const snippet = await this.snippetManagerService.deleteSnippet(args.name, context.guildId);

        if (!snippet) {
            await context.error(`Snippet \`${args.name}\` does not exist.`);
            return;
        }

        await context.success(`Snippet \`${args.name}\` has been deleted.`);
    }
}

export default SnippetDeleteCommand;
