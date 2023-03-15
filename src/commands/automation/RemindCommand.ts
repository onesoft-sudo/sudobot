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

import { CommandInteraction, EmojiIdentifierResolvable, GuildMember, Message, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import MessageEmbed from '../../client/MessageEmbed';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import { emoji } from '../../utils/Emoji';
import ms from 'enhanced-ms';
import ReminderQueue from '../../queues/ReminderQueue';
import { formatDistanceToNowStrict } from 'date-fns';

export default class RemindCommand extends BaseCommand {
    name = "remind";
    category = "automation";
    aliases = ['reminder'];

    supportsInteractions: boolean = true;
    coolDown = 4000;

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply(`${emoji('error')} Please specify the time interval after which the bot should remind you.`);
            return;
        }

        if (!options.isInteraction && options.args[1] === undefined) {
            await message.reply(`${emoji('error')} Please specify what to remind!`);
            return;
        }

        const time = options.isInteraction ? options.options.getString("time", true) : options.args[0];
        let parsedTime = ms(time);

        if (!parsedTime) {
            await message.reply(`${emoji('error')} Invalid time interval specified!`);
            return;
        }

        if (message instanceof CommandInteraction)
            await message.deferReply({ ephemeral: true });
 
        const description = options.isInteraction ? options.options.getString("description", true) : (message as Message).content.trim().slice(client.config.props[message.guildId!].prefix.length).trim().slice(options.cmdName.length).trim().slice(time.length).trim();

        await client.queueManager.addQueue(ReminderQueue, {
            data: {
                userID: message.member!.user.id,
                description,
                createdAt: (new Date()).toUTCString()
            },
            runAt: new Date(Date.now() + parsedTime),
            guild: message.guild!.id
        });

        await this.deferReply(message, {
            content: `${emoji('check')} The system will remind you in ${formatDistanceToNowStrict(new Date(Date.now() - parsedTime))}.`
        });
    }
}