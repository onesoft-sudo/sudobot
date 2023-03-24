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

import { CommandInteraction, Message, Util } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { formatDuration, intervalToDuration } from 'date-fns';
import StaffAway from '../../models/StaffAway';
import { emoji } from '../../utils/Emoji';

export default class AFKCommand extends BaseCommand {
    supportsInteractions = true;

    constructor() {
        super('staffaway', 'utils', ['safk', 'saway']);
    }

    async run(client: DiscordClient, message: Message, options: CommandOptions) {
        let status: string | undefined = message.content.slice(client.config.props[message.guildId!].prefix.length).trim().slice(options.cmdName.length).trim();

        if (message instanceof Message) {
            status = status?.trim() === '' ? undefined : status;
        }
        
        if (status && status.replace(/<\w+\:\d+>/gi, '').length > 4000) {
            message.reply(":x: The reason is too long. Make sure it has less than 4000 characters.").catch(console.error);
            return;
        }

        const entry = await StaffAway.findOne({ user: message.author.id });

        if (!entry) {
            const newEntry = await StaffAway.create({
                user: message.author.id,
                createdAt: new Date(),
                guild_id: message.guildId!,
                reason: status
            });

            client.utils.staffAwayList.push(newEntry);

            await message.reply(`${emoji('check')} Thanks for letting us know that you will be away.`);
        }
        else {
            client.utils.findStaffAway(message.guildId!, message.author.id, true);
            await entry.delete();
            await message.reply(`${emoji('check')} Welcome back, we've removed your away status.`);
        }
    }
}
