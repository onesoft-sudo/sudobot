import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import QueueService from "@main/services/QueueService";

type QueueCancelCommandArgs = {
    id: number;
};

@TakesArgument<QueueCancelCommandArgs>({
    names: ["id"],
    types: [IntegerArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide a Queued Job ID!",
            [ErrorType.InvalidType]: "The provided ID is not a valid integer!"
        }
    ],
    interactionName: "id"
})
class QueueCancelCommand extends Command {
    public override readonly name = "queue::cancel";
    public override readonly description: string = "Cancels a queued job.";
    public override readonly defer = true;
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly usage = ["<id: Int>"];
    public override readonly aliases = ["queue::remove", "queue::delete"];

    @Inject()
    private readonly queueService!: QueueService;

    public override async execute(context: Context, args: QueueCancelCommandArgs): Promise<void> {
        const job = this.queueService.getJob(args.id);

        if (!job) {
            return void (await context.error("No queued job found with that ID."));
        }

        if (job.isExecuting) {
            return void (await context.error(
                "You cannot cancel a job that is currently executing."
            ));
        }

        await job.cancel();

        await context.success(`Successfully cancelled the job with ID ${job.id}.`);
    }
}

export default QueueCancelCommand;
