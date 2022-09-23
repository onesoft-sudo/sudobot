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

import { CommandInteraction, EmojiIdentifierResolvable, FileOptions, GuildMember, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';
import { fetchEmoji } from '../../utils/Emoji';
import { parseEmbedsInString } from '../../utils/util';

export default class SendCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('send', 'moderation', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if (!options.isInteraction && typeof options.args[1] === 'undefined') {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`This command requires at least two arguments.`)
                ]
            });

            return;
        }

        let content: string;
        let member: GuildMember | undefined | null;

        if (options.isInteraction) {
            member = await <GuildMember> options.options.getMember('member');
            content = await <string> options.options.getString('content');
        }
        else {
            member = await getMember(msg as Message, options);

            if (!member) {
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });

                return;
            }

            options.args.shift();
            content = await options.args.join(' ');
        }

        try {
            let { embeds, content: parsedContent } = parseEmbedsInString(content);

            await member.send({
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
                    .setDescription(`Failed to send message. Maybe invalid embed schema or the user has disabled DMs?`)
                ],
                ephemeral: true
            });

            return;
        }
    }
}