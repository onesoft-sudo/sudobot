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

import BaseEvent from '../../utils/structures/BaseEvent';
import { FileOptions, Message } from 'discord.js';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import path from 'path';
import MessageEmbed from '../../client/MessageEmbed';

export default class MessageCreateEvent extends BaseEvent {
    constructor() {
        super('messageCreate');
    }

    async run(client: DiscordClient, message: Message) {
        if (message.author.bot || !message.guild || message.channel.type === 'DM') 
            return;

        await client.setMessage(message);

        await client.spamFilter.start(message);
        await client.messageFilter.start(message);
        
        if (message.content.startsWith(client.config.get('prefix'))) {
            const [cmdName, ...args] = await message.content
                .slice(client.config.get('prefix').length)
                .trim()
                .split(/ +/);
                
            const command = await client.commands.get(cmdName);

            if (command && command.supportsLegacy) {
                const allowed = await client.auth.verify(message.member!, command);
                
                if (allowed) {
                    const options = {
                        cmdName,
                        args,
                        argv: [cmdName, ...args],
                        normalArgs: args.filter(a => a[0] !== '-'),
                        options: args.filter(a => a[0] === '-'),
                        isInteraction: false
                    } as CommandOptions;
                    
                    await command.execute(client, message, options);    
                }
                else {
                    await message.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(":x: You don't have permission to run this command.")
                        ]
                    });
                }

                return;
            }
            
            const snippet = await client.snippetManager.getParsed(message.guild!.id, cmdName);

            if (snippet) {                
                try {
                    await message.channel.send({
                        content: snippet.content.trim() === '' ? undefined : snippet.content,
                        files: snippet.files.map(name => {
                            return {
                                name,
                                attachment: path.resolve(process.env.SUDO_PREFIX ?? path.join(__dirname, '../../..'), 'storage', name)
                            } as FileOptions
                        }),
                        embeds: snippet.embeds
                    });
                }
                catch (e) {
                    console.log(e);                    
                }

                return;
            }
        }

        await client.afkEngine.start(message);
    }
}
