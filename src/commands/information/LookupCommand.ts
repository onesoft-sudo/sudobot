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

import { CommandInteraction, Permissions } from "discord.js";
import Client from "../../client/Client";
import InteractionOptions from "../../types/InteractionOptions";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class LookupCommand extends BaseCommand {
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super("lookup", "information", []);
    }

    async run(client: Client, interaction: CommandInteraction, options: InteractionOptions): Promise<void> {
        if (interaction.options.getSubcommand() === "user") {
            await client.commands.get("userlookup")?.execute(client, interaction, options);
        }
        else if (interaction.options.getSubcommand() === "guild") {
            await client.commands.get("guildlookup")?.execute(client, interaction, options);
        }
        else if (interaction.options.getSubcommand() === "avatar") {
            await client.commands.get("avatarlookup")?.execute(client, interaction, options);
        }
        else {
            await interaction.reply({ content: "Invalid subcommand given. Must be one of 'user' or 'guild'." });
        }
    }
}