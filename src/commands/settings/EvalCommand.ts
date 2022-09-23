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

export default class EvalCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    ownerOnly = true;

    constructor() {
        super('eval', 'settings', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply({
                content: emoji('error') + " Please enter the raw code that you want to execute.",
                ephemeral: true
            });

            return;
        }

        const code = options.isInteraction ? options.options.getString('code') : options.args.join(' ');

        try {
            const result = eval(code!);

            await message.reply({
                content: `${emoji('check')} **Execution Result:**\n\n\`\`\`js\n${result}\`\`\``,
                ephemeral: true
            });
        }
        catch (e) {
            await message.reply({
                content: `${emoji('error')} **Error Occurred!**\n\n\`\`\`\n${e}\`\`\``,
                ephemeral: true
            });
        }
    }
}