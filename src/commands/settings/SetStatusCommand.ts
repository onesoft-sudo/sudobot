
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

import { ClientPresenceStatus, CommandInteraction, ExcludeEnum, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { ActivityTypes } from 'discord.js/typings/enums';
import { fetchEmoji } from '../../utils/Emoji';

export default class SetStatusCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    ownerOnly = true;

    constructor() {
        super('setstatus', 'settings', []);
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply({
                content: 'This command requires at least one argument'
            });

            return;
        }

        let status: ClientPresenceStatus | undefined;
        let activity: string;
        let type: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'> = 'WATCHING';

        if (options.isInteraction) {
            activity = <string> options.options.getString('activity');

            if (options.options.getString('status'))
                status = <ClientPresenceStatus> options.options.getString('status');

            if (options.options.getString('type'))
                type = <typeof type> options.options.getString('type');
        }
        else {
            activity = options.args.join(' ');
        }
        
        await client.randomStatus.config(activity, type);
        await client.randomStatus.update(status);

        await message.reply({
            content: (await fetchEmoji('check'))?.toString() + ' Status updated.'
        });
    }
}