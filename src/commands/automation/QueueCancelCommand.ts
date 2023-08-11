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

import { PermissionsBitField } from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class QueueCancelCommand extends Command {
    public readonly name = "queue__cancel";
    public readonly validationRules: ValidationRule[] = [];
    public readonly aliases = ["queue__remove", "queuecancel", "cancelqueue", "rmqueue", "delqueue", "removequeue", "queuedel"];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly description = "Cancels a command queue";
    public readonly since = "5.57.0";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && !context.args[0]) {
            await this.error(message, "Please provide the ID of the queue to remove!");
            return;
        }

        const id = context.isLegacy ? parseInt(context.args[0] ?? "") : context.options.getInteger("id", true);

        if (isNaN(id)) {
            await this.error(message, "Please provide a valid queue ID!");
            return;
        }

        const queue = this.client.queueManager.queues.get(id.toString());

        if (!queue || queue.options.guild.id !== message.guildId!) {
            await this.error(message, "Could not find a queue with that ID!");
            return;
        }

        await this.client.queueManager.removeById(id);
        await this.success(message, `Successfully removed queue with ID \`${id}\`.`);
    }
}
