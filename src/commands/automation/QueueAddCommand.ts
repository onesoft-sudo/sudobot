/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { formatDistanceToNowStrict } from "date-fns";
import { EmbedBuilder, Message, PermissionsBitField, escapeMarkdown } from "discord.js";
import path from "path";
import Command, {
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";
import QueueEntry from "../../utils/QueueEntry";
import { stringToTimeInterval } from "../../utils/datetime";

export default class QueueAddCommand extends Command {
    public readonly name = "queue__add";
    public readonly validationRules: ValidationRule[] = [];
    public readonly aliases = ["queueadd", "addqueue", "createqueue"];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly description = "Creates a new command queue";
    public readonly since = "5.57.0";
    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const deferredMessage = await (await this.deferIfInteraction(message))?.fetch();
        const runAfterString = context.isLegacy
            ? context.args[0]
            : context.options.getString("run_after", true);

        if (!runAfterString) {
            await this.error(message, "Please specify after how much time the queue should run!");
            return;
        }

        const { error, result: runAfter } = stringToTimeInterval(runAfterString, {
            milliseconds: true
        });

        if (error) {
            await this.error(message, error);
            return;
        }

        if (context.isLegacy && !context.args[1]) {
            await this.error(message, "Please specify the command to queue!");
            return;
        }

        const commandString = context.isLegacy
            ? (message as Message).content
                  .substring(
                      this.client.configManager.config[message.guildId!]?.prefix?.length ?? 1
                  )
                  .trimStart()
                  .substring(context.argv[0] === "queue" ? "queue".length : 0)
                  .trimStart()
                  .substring(
                      context.argv[0] === "queue"
                          ? this.name.replace("queue__", "").length
                          : context.argv[0].length
                  )
                  .trimStart()
                  .substring(runAfterString.length)
                  .trim()
            : context.options.getString("command", true).trim();

        let commandName = "",
            content = "";

        const prefix = this.client.configManager.config[message.guildId!]?.prefix ?? "-";

        if (message instanceof Message) {
            content = message.content;
            message.content = prefix + commandString;
        } else {
            commandName = message.commandName;
            message.commandName = commandString.split(/ +/)[0];

            if (
                this.client.commands.get(message.commandName) &&
                !this.client.commands.get(message.commandName)?.supportsLegacy
            ) {
                message.commandName = commandName;
                await this.error(
                    message,
                    "This command doesn't support legacy mode, and only legacy commands can be queued!"
                );
                return;
            }
        }

        const result = await this.client.commandManager.runCommandFromMessage(
            message as Message,
            true,
            true
        );

        if (message instanceof Message) {
            message.content = content;
        } else {
            message.commandName = commandName;
        }

        if (result === null) {
            return;
        }

        if (result === false) {
            await this.error(
                message,
                "The command you've specified could not be found. Please check for spelling errors."
            );
            return;
        }

        const id = await this.client.queueManager.add(
            new QueueEntry({
                args: [
                    message.channelId!,
                    message instanceof Message ? message.id : deferredMessage!.id,
                    commandString
                ],
                client: this.client,
                createdAt: new Date(),
                filePath: path.resolve(__dirname, "../../queues/CommandQueue"),
                guild: message.guild!,
                name: "CommandQueue",
                userId: message.member!.user.id,
                willRunAt: new Date(Date.now() + runAfter)
            })
        );

        await this.deferredReply(message, {
            embeds: [
                new EmbedBuilder({
                    title: "Queue created",
                    color: 0x007bff,
                    description: `${this.emoji(
                        "check"
                    )} Successfully added the queue. The following command will be run after **${formatDistanceToNowStrict(
                        new Date(Date.now() - runAfter)
                    )}**:\n\n\`\`\`${escapeMarkdown(prefix + commandString)}\`\`\``,
                    fields: [
                        {
                            name: "Queue ID",
                            value: id.toString()
                        }
                    ]
                }).setTimestamp()
            ]
        });
    }
}
