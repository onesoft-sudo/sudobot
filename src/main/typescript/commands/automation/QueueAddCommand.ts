import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import DurationArgument from "@framework/arguments/DurationArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import Duration from "@framework/datetime/Duration";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import CommandExecutionQueue from "@main/queues/CommandExecutionQueue";
import CommandManager from "@main/services/CommandManager";
import QueueService from "@main/services/QueueService";
import { Message, inlineCode } from "discord.js";

type QueueAddCommandArgs = {
    runAfter: Duration;
    command: string;
};

@TakesArgument<QueueAddCommandArgs>({
    names: ["runAfter"],
    types: [DurationArgument],
    optional: false,
    errorMessages: [DurationArgument.defaultErrors],
    interactionName: "run_after"
})
@TakesArgument<QueueAddCommandArgs>({
    names: ["command"],
    types: [RestStringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "You must specify a command to queue."
        }
    ],
    interactionName: "command"
})
class QueueAddCommand extends Command {
    public override readonly name = "queue::add";
    public override readonly description: string = "Add a command execution queued job.";
    public override readonly detailedDescription: string =
        "Queues the given command to be run at a later time.";
    public override readonly defer = true;
    public override readonly permissions = [PermissionFlags.ManageGuild];

    @Inject()
    private readonly commandManager!: CommandManager;

    @Inject()
    private readonly queueManager!: QueueService;

    public override async execute(context: Context, args: QueueAddCommandArgs): Promise<void> {
        const { command, runAfter } = args;
        const spaceIndex = command.indexOf(" ");
        const newLineIndex = command.indexOf("\n");
        const index =
            spaceIndex === -1 || newLineIndex === -1
                ? Math.max(spaceIndex, newLineIndex)
                : Math.min(spaceIndex, newLineIndex);
        const commandName = command.slice(0, index === -1 ? command.length : index);

        if (!this.commandManager.commands.has(commandName)) {
            return void context.error(
                `The specified command ${inlineCode(commandName)} does not exist.`
            );
        }

        let messageId: string;
        let reply: Message | undefined;

        if (context.isLegacy()) {
            messageId = context.commandMessage.id;
        } else {
            reply = await context.reply(`${context.emoji("loading")} Creating queue job...`);
            messageId = reply.id;
        }

        const id = await this.queueManager
            .create(CommandExecutionQueue, {
                data: {
                    guildId: context.guildId,
                    memberId: context.memberId!,
                    messageId,
                    channelId: context.channelId,
                    commandString: command,
                    fromInteraction: context.isChatInput()
                },
                guildId: context.guildId,
                userId: context.userId,
                runsAt: new Date(Date.now() + runAfter.toMilliseconds())
            })
            .schedule();

        const response = `${context.emoji("check")} Successfully queued the given command. The queue ID is ${inlineCode(id.toString())}.`;

        if (reply) {
            await reply.edit(response);
        } else {
            await context.reply(response);
        }
    }
}

export default QueueAddCommand;
