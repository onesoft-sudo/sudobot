import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import DurationArgument from "@framework/arguments/DurationArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import Duration from "@framework/datetime/Duration";
import ReminderQueue from "@main/queues/ReminderQueue";

type RemindCommandArgs = {
    after: Duration;
    message: string;
};

@ArgumentSchema.Definition({
    names: ["after"],
    types: [DurationArgument],
    optional: false,
    errorMessages: [DurationArgument.defaultErrors]
})
@ArgumentSchema.Definition({
    names: ["message"],
    types: [RestStringArgument],
    optional: false,
    rules: [
        {
            "range:min": 0,
            "range:max": 2000
        }
    ],
    errorMessages: [
        {
            [ErrorType.Required]: "You must specify a message to remind.",
            [ErrorType.InvalidRange]: "The message must be between 0 and 2000 characters."
        }
    ]
})
class RemindCommand extends Command {
    public override readonly name = "remind";
    public override readonly description: string = "Set a reminder for yourself.";
    public override readonly detailedDescription: string =
        "Set a reminder queue that will remind you about something by sending you a direct message after a certain amount of time.";
    public override readonly defer = true;
    public override readonly usage = ["<duration: Duration> <...message: RestString>"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("after")
                        .setDescription("The duration to wait before reminding you.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription("The message to remind you with.")
                        .setRequired(true)
                )
        ];
    }

    public override async execute(context: Context, args: RemindCommandArgs): Promise<void> {
        const { after, message } = args;

        await this.application
            .service("queueService")
            .create(ReminderQueue, {
                data: {
                    createdAt: new Date().toISOString(),
                    message,
                    userId: context.user.id
                },
                guildId: context.guild.id,
                runsAt: after.fromNow()
            })
            .schedule();

        await context.success(
            `The system will remind you ${after.formatForDiscord("R")} with the message: ${message}`
        );
    }
}

export default RemindCommand;
