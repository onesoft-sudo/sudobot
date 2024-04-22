import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Command, CommandMessage } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import InfractionManager from "@main/services/InfractionManager";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { PermissionFlagsBits } from "discord.js";

type InfractionReasonCommandArgs = {
    id: number;
    reason: string;
};

@TakesArgument<InfractionReasonCommandArgs>({
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
@TakesArgument<InfractionReasonCommandArgs>({
    names: ["reason"],
    types: [RestStringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "Invalid reason provided.",
            [ErrorType.Required]: "Reason is required."
        }
    ],
    interactionName: "reason",
    interactionType: RestStringArgument
})
class InfractionReasonCommand extends Command {
    public override readonly name = "infraction::reason";
    public override readonly description: string = "Update the reason of an infraction.";
    public override readonly permissions = [PermissionFlagsBits.ManageMessages];
    public override readonly usage = ["<id: number> <reason: string>"];

    @Inject()
    protected readonly infractionManager!: InfractionManager;

    @Inject()
    protected readonly permissionManager!: PermissionManagerService;

    public override async execute(
        context: Context<CommandMessage>,
        args: InfractionReasonCommandArgs
    ): Promise<void> {
        await context.defer({
            ephemeral: true
        });

        const { id, reason } = args;

        const isSuccess = await this.infractionManager.updateReasonById(id, reason);

        if (!isSuccess) {
            await context.error("No infraction found with that ID.");
            return;
        }

        await context.success(`Reason of infraction with ID **${id}** has been updated.`);
    }
}

export default InfractionReasonCommand;
