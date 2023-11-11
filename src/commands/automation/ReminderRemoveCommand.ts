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

import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class ReminderRemoveCommand extends Command {
    public readonly name = "reminder__remove";
    public readonly validationRules: ValidationRule[] = [];
    public readonly aliases = ["reminder__delete", "reminder__cancel"];

    public readonly description = "Cancels a queued reminder for the user who runs this command.";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        if (context.isLegacy && (!context.args[1] || isNaN(parseInt(context.args[1])))) {
            await this.error(message, "Invalid ID specified. Make sure the ID is a valid integer.");
            return;
        }

        const id = context.isLegacy ? parseInt(context.args[1]) : context.options.getInteger("id", true);

        const queue = this.client.queueManager.queues.find(
            queue =>
                queue.options.name === "ReminderQueue" && queue.options.userId === message.member!.user!.id && queue.id === id
        );

        if (!queue) {
            await this.error(message, "No such reminder found with that ID, associated with you.");
            return;
        }

        await this.client.queueManager.remove(queue);
        await this.success(message, `Successfully removed reminder **#${id}**`);
    }
}
