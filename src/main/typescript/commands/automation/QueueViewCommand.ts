import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { shortUserInfo } from "@framework/utils/embeds";
import { Colors } from "@main/constants/Colors";
import CommandExecutionQueue from "@main/queues/CommandExecutionQueue";
import QueueService from "@main/services/QueueService";
import { inlineCode, italic, time } from "discord.js";

type QueueViewCommandArgs = {
    id: number;
};

@ArgumentSchema.Definition({
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
class QueueViewCommand extends Command {
    public override readonly name = "queue::view";
    public override readonly description: string = "Shows information about a queued job.";
    public override readonly defer = true;
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly usage = ["<id: Int>"];
    public override readonly aliases = ["queue::show"];

    @Inject()
    private readonly queueService!: QueueService;

    public override async execute(context: Context, args: QueueViewCommandArgs): Promise<void> {
        const job = this.queueService.getJob(args.id);

        if (!job) {
            return void (await context.error("No queued job found with that ID."));
        }

        const fields = [
            {
                name: "Type",
                value: inlineCode(
                    (job.constructor as unknown as { uniqueName: string }).uniqueName
                ),
                inline: false
            },
            {
                name: "Created By",
                value: job.userId
                    ? job.userId === "0"
                        ? "[Unknown]"
                        : shortUserInfo(this.application.client, job.userId)
                    : italic("Unknown"),
                inline: false
            },
            {
                name: "Creation Time",
                value: job.createdAt
                    ? `${time(job.createdAt, "F")} (${time(job.createdAt, "R")})`
                    : "`[Not yet created]`",
                inline: true
            },
            {
                name: "Execution Time",
                value: `${time(job.runsAt, "F")} (${time(job.runsAt, "R")})`,
                inline: true
            }
        ];

        if (job instanceof CommandExecutionQueue) {
            fields.push({
                name: "Command To Execute",
                value: inlineCode(job.data.commandString),
                inline: false
            });
        }

        await context.reply({
            embeds: [
                {
                    title: `Job #${job.id}`,
                    color: Colors.Primary,
                    fields,
                    timestamp: new Date().toISOString()
                }
            ]
        });
    }
}

export default QueueViewCommand;
