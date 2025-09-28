/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
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
import { inlineCode, Message } from "discord.js";

type QueueAddCommandArgs = {
    runAfter: Duration;
    command: string;
};

@ArgumentSchema.Definition({
    names: ["runAfter"],
    types: [DurationArgument],
    optional: false,
    errorMessages: [DurationArgument.defaultErrors],
    interactionName: "run_after"
})
@ArgumentSchema.Definition({
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
    public override readonly detailedDescription: string = "Queues the given command to be run at a later time.";
    public override readonly defer = true;
    public override readonly permissions = [PermissionFlags.ManageGuild];

    @Inject()
    private readonly commandManager!: CommandManager;

    @Inject()
    private readonly queueManager!: QueueService;

    public override async execute(context: Context, args: QueueAddCommandArgs): Promise<void> {
        console.log("args", args);

        const { command, runAfter } = args;
        const spaceIndex = command.indexOf(" ");
        const newLineIndex = command.indexOf("\n");
        const index =
            spaceIndex === -1 || newLineIndex === -1
                ? Math.max(spaceIndex, newLineIndex)
                : Math.min(spaceIndex, newLineIndex);
        const commandName = command.slice(0, index === -1 ? command.length : index);

        if (!this.commandManager.commands.has(commandName)) {
            return void context.error(`The specified command ${inlineCode(commandName)} does not exist.`);
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
