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

import Command, { BasicCommandContext, CommandMessage, CommandReturn } from "../../core/Command";

export default class BallotDeleteCommand extends Command {
    public readonly name = "ballot__delete";
    public readonly permissions = [];
    public readonly description = "Deletes a poll/ballot.";
    public readonly supportsInteractions: boolean = true;
    public readonly supportsLegacy: boolean = true;

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            await this.error(message, "Please provide the ballot ID!");
            return;
        }

        await this.deferIfInteraction(message);

        const id = context.isLegacy
            ? parseInt(context.args[0])
            : context.options.getInteger("id", true);

        if (isNaN(id)) {
            await this.error(
                message,
                "Invalid ballot ID given! Ballot IDs must be numeric values."
            );
            return;
        }

        const { count } = await this.client.ballotManager.delete({
            id,
            guildId: message.guildId!
        });

        if (count === 0) {
            await this.error(message, "No such ballot exists with that ID!");
            return;
        }

        await this.success(message, "The ballot was deleted successfully.");
    }
}
