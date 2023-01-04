/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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

import { Message, CacheType, CommandInteraction } from "discord.js";
import Client from "../../client/Client";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class InfractionCommand extends BaseCommand {
    name = "infraction";
    category = "moderation";
    aliases = ['infractions', 'infrs', 'punishments'];
    supportsInteractions = true;

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        const subcommands = ['view', 'delete', 'clear', 'reasonupdate'];
        const subcommand = options.isInteraction ? options.options.getSubcommand(true) : options.args.shift();

        if (subcommand === undefined) {
            await message.reply(`:x: No subcommand provided! You must provide one of the follwing subcommands: \`${subcommands.join('`, `')}\`.`);
            return;
        }

        if (!options.isInteraction && !subcommands.includes(subcommand)) {
            await message.reply(`:x: Invalid subcommand provided! You must provide one of the follwing subcommands: \`${subcommands.join('`, `')}\`.`);
            return;
        }

        const command = client.commands.get(`infraction__${subcommand}`);

        if (command) {
            await command.execute(client, message, options);
        }
    }
}