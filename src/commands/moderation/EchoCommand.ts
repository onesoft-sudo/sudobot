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

import { CommandInteraction, EmojiIdentifierResolvable, FileOptions, Message, TextChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';
import { parseEmbedsInString } from '../../utils/util';
import { LogLevel } from '../../services/DebugLogger';

export default class EchoCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('echo', 'moderation', []);
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
        let channel: TextChannel = <TextChannel> msg.channel;

        if (options.isInteraction) {
            content = await <string> options.options.getString('content');

            if (options.options.getChannel('channel')) {
                channel = await <TextChannel> options.options.getChannel('channel');
            }
        }
        else {
            if ((msg as Message).mentions.channels.last()) {
                channel = await <TextChannel> (msg as Message).mentions.channels.last();
                await options.args.pop();
            }

            content = await options.args.join(' ');
        }
        
        if (!channel.send) {
            await msg.reply({
                content: 'Invalid text channel.',
                ephemeral: true
            });

            return;
        }

        const log = "======== " + (msg.member!.user as User).tag + " executed echo command =====";
        console.log(log);
        client.debugLogger.logApp(LogLevel.INFO, log);

        try {                
            let { embeds, content: parsedContent } = parseEmbedsInString(content);

            await channel.send({
                content: parsedContent.trim() === '' ? undefined : parsedContent,
                embeds,
                files: msg instanceof CommandInteraction ? undefined : [...msg.attachments.map(a => ({
                    attachment: a.proxyURL,
                    description: a.description,
                    name: a.name
                } as FileOptions)).values()]
            });

            if (options.isInteraction) {
                const emoji = await fetchEmoji('check');

                console.log(emoji);                

                await msg.reply({
                    content: emoji!.toString() + " Message sent!",
                    ephemeral: true
                });
            }
            else {
                await (msg as Message).react(await fetchEmoji('check') as EmojiIdentifierResolvable);
            }
        }
        catch (e) {
            console.log(e);
            
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Failed to send message. Maybe missing permissions or invalid embed schema?`)
                ],
                ephemeral: true
            });

            return;
        }
    }
}