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

export default class AFKCommand extends BaseCommand {
    supportsInteractions = true;

    constructor() {
        super('afk', 'utils', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        let status = options.isInteraction ? options.options.getString("reason") ?? undefined : options.args.join(" ");

        if (message instanceof Message) {
            status = status?.trim() === '' ? undefined : status;
        }
        
        if (status && status.length > 100) {
            message.reply(":x: AFK reason is too long. Make sure it has less than 100 characters.").catch(console.error);
            return;
        }

        await client.afkEngine.toggle(message, true, status);
    }
}
