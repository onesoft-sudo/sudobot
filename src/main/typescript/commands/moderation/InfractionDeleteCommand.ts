import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { Infraction } from "@main/models/Infraction";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";

type InfractionDeleteCommandArgs = {
    id: number;
};

@TakesArgument<InfractionDeleteCommandArgs>({
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
})
class InfractionDeleteCommand extends Command {
    public override readonly name = "infraction::delete";
    public override readonly description: string = "Delete an infraction.";
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

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionDeleteCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const infraction: Infraction | undefined = await this.infractionManager.deleteById(
            context.guildId!,
            args.id
        );

        if (!infraction) {
            await context.error("No infraction found with that ID.");
            return;
        }

        await context.success(`Infraction with ID **${infraction.id}** has been deleted.`);
    }
}

export default InfractionDeleteCommand;
