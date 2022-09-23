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

import { CommandInteraction, GuildEmoji, Message, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';

export default class AnnounceCommand extends BaseCommand {
    supportsInteractions = true;

    constructor() {
        super('announce', 'utils', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[0] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least one argument.`)
                ]
            });

            return;
        }

        let content: string;

        if (options.isInteraction) {
            content = <string> await options.options.getString('content');
        }
        else {
            content = await options.args.join(' ');
        }

        try {
            const channel = await <TextChannel> msg.guild!.channels.cache.find(c => c.id === client.config.get('announcement_channel'));

            if (!channel) {
                await msg.reply({
                    content: ":x: Channel not found"
                });

                return;
            }

            await channel.send({
                content
            });

            if (msg instanceof Message) 
                await msg.react(<GuildEmoji> (await fetchEmoji('check')));
            else
                await msg.reply({
                    content: (<GuildEmoji> (await fetchEmoji('check'))).toString() + " The message has been announced!",
                    ephemeral: true
                });
        }
        catch(e) {
            console.log(e);

            await msg.reply({
                content: ":x: Failed to send message",
                ephemeral: true
            });
        }
    }
}