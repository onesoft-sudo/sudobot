import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import StringArgument from "@framework/arguments/StringArgument";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import SnippetManagerService from "@main/services/SnippetManagerService";

type SnippetEditCommandArgs = {
    name: string;
    attribute: string;
    value: string;
};

@TakesArgument<SnippetEditCommandArgs>({
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
@TakesArgument<SnippetEditCommandArgs>({
    names: ["attribute"],
    types: [StringArgument],
    optional: false,
    rules: [
        {
            "range:max": 100
        }
    ],
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide an attribute of the snippet to edit.",
            [ErrorType.InvalidRange]:
                "The name of the attribute must be between 1 and 100 characters."
        }
    ]
})
@TakesArgument<SnippetEditCommandArgs>({
    names: ["value"],
    types: [RestStringArgument],
    optional: false,
    rules: [
        {
            "range:max": 4000
        }
    ],
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide an attribute value of the snippet to set.",
            [ErrorType.InvalidRange]: "The attribute value must be between 1 and 4000 characters."
        }
    ]
})
class SnippetEditCommand extends Command {
    public override readonly name = "snippet::edit";
    public override readonly description: string = "Edits a snippet.";
    public override readonly defer = true;
    public override readonly usage = ["<name: String> <attribute: String> <...value: RestString>"];
    public override readonly aliases = ["snippet::update"];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.BanMembers
    ];
    public override readonly permissionCheckingMode = "or";
    private static readonly attributes = [
        "perm",
        "permission_mode",
        "pmode",
        "level",
        "permission",
        "content",
        "randomize"
    ];

    @Inject()
    private readonly snippetManagerService!: SnippetManagerService;

    public override async execute(context: Context, args: SnippetEditCommandArgs): Promise<void> {
        if (!this.snippetManagerService.hasSnippet(args.name, context.guildId)) {
            await context.error(`Snippet \`${args.name}\` does not exist.`);
            return;
        }

        if (!SnippetEditCommand.attributes.includes(args.attribute)) {
            await context.error(
                `Attribute \`${args.attribute}\` is not a valid attribute. Valid attributes are: ${SnippetEditCommand.attributes.join(", ")}`
            );
            return;
        }

        const { error } = await this.snippetManagerService.updateSnippet(
            args.name,
            args.attribute,
            args.value,
            context.guildId
        );

        if (error) {
            await context.error(error);
            return;
        }

        await context.success(`Snippet \`${args.name}\` has been updated.`);
    }
}

export default SnippetEditCommand;
