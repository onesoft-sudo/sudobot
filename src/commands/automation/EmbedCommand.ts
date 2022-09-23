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

import { CommandInteraction, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { emoji } from '../../utils/Emoji';

export default class EmbedCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    subcommands = ['send', 'schema', 'build'];

    constructor() {
        super('embed', 'automation', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction) {
            await message.reply(`${emoji('error')} This command can not be used in legacy mode. Use slash commands instead.`);
            return;
        }

        const subcommand = options.options.getSubcommand();

        const command = client.commands.get('embed__' + subcommand);

        if (command) {
            await command.execute(client, message, options);
        }
    }
}