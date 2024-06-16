import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import SnippetManagerService from "@main/services/SnippetManagerService";

type SnippetPushFileCommandArgs = {
    name: string;
};

@TakesArgument<SnippetPushFileCommandArgs>({
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
class SnippetPushFileCommand extends Command {
    public override readonly name = "snippet::pushfile";
    public override readonly description: string = "Add a file to a dynamic snippet.";
    public override readonly defer = true;
    public override readonly usage = [""];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.BanMembers
    ];
    public override readonly permissionCheckingMode = "or";

    @Inject()
    private readonly snippetManagerService!: SnippetManagerService;

    public override async execute(
        context: Context,
        { name }: SnippetPushFileCommandArgs
    ): Promise<void> {
        if (context.attachments.size === 0) {
            await context.error("Please specify at least one attachment to push!");
            return;
        }

        const snippet = await this.snippetManagerService.pushAttachment(
            name,
            [...context.attachments.map(a => a.proxyURL).values()],
            context.guildId!
        );

        if (!snippet) {
            await context.error(`Snippet \`${name}\` does not exist.`);
            return;
        }

        await context.success(`Attachment has been pushed to snippet \`${name}\`.`);
    }
}

export default SnippetPushFileCommand;
