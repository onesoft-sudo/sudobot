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
import { SlashCommandBuilder } from "discord.js";
import path from "path";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import QueueEntry from "../../utils/QueueEntry";
import { stringToTimeInterval } from "../../utils/datetime";

export default class RemindCommand extends Command {
    public readonly name = "remind";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.TimeInterval],
            minValue: 1,
            minMaxErrorMessage: "Please specify a valid time interval!",
            requiredErrorMessage: "Please specify after how long I should remind you!",
            typeErrorMessage: "Please specify a valid time interval!",
            timeMilliseconds: true,
            name: "time_interval"
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            typeErrorMessage: "Please specify a valid reminder message!",
            name: "message"
        }
    ];
    public readonly permissions = [];
    public readonly description = "Set a reminder.";
    public readonly detailedDescription = "Sets a reminder. The bot will remind you after the specified time interval.";
    public readonly argumentSyntaxes = ["<time_interval> [reason]"];
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option =>
            option.setName("time_interval").setDescription("Specify the time after the bot should remind you").setRequired(true)
        )
        .addStringOption(option => option.setName("message").setDescription("The reminder message"));

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        let timeInterval = context.isLegacy
            ? context.parsedNamedArgs.time_interval
            : context.options.getString("time_interval", true);

        if (!context.isLegacy) {
            const { error, result } = stringToTimeInterval(timeInterval, {
                milliseconds: true
            });

            if (error) {
                await this.error(message, error);
                return;
            }

            timeInterval = result;
        }

        const reminderMessage: string | undefined = context.isLegacy
            ? context.parsedNamedArgs.message
            : context.options.getString("message");

        await this.client.queueManager.add(
            new QueueEntry({
                args: [message.member!.user.id, reminderMessage ?? ""],
                client: this.client,
                createdAt: new Date(),
                filePath: path.resolve(__dirname, "../../queues/ReminderQueue"),
                guild: message.guild!,
                name: "ReminderQueue",
                userId: message.member!.user.id,
                willRunAt: new Date(Date.now() + timeInterval)
            })
        );

        await this.success(
            message,
            `The system will remind you in ${formatDistanceToNowStrict(new Date(Date.now() - timeInterval))}.`
        );
    }
}
