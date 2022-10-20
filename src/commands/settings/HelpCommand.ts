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
import Help from '../../utils/Help';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { getAllCommandData, renderCommandMeta } from '../../services/CommandMetaDataManager';
import Pagination from '../../utils/Pagination';

export default class HelpCommand extends BaseCommand {
    constructor() {
        super('help', 'settings', ['?']);
        this.supportsInteractions = true;
    }

    async render() {
        let string = '';

        for (let cmd of Help) {
            string += `\n\n**${cmd.name}**\n${cmd.shortBrief}`;
        }

        return string;
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        if ((options.isInteraction && !options.options.getString('command')) || (!options.isInteraction && options.args[0] === undefined)) {
            const commandData = getAllCommandData();
            const pagination = new Pagination(commandData, {
                channel_id: message.channel!.id,
                guild_id: message.guild!.id,
                limit: 10,
                user_id: message.member!.user.id,
                timeout: 120_000,
                embedBuilder({ data, maxPages, currentPage }) {
                    let description = `\`<...>\` means required argument and \`[...]\` means optional argument.\nRun \`${client.config.get('prefix')}help <CommandName>\` for more information about a specific command.\n\n`;

                    for (const { name, shortBrief } of data) {
                        description += `**${name}**\n`;
                        description += `${shortBrief}\n\n`;
                    }

                    return new MessageEmbed({
                        author: {
                            iconURL: client.user?.displayAvatarURL(),
                            name: "Help"
                        },
                        description,
                        footer: {
                            text: `Page ${currentPage} of ${maxPages} • ${commandData.length} commands total`
                        }
                    });
                },
            });

            let reply = await message.reply(pagination.getMessageOptions(1));

            if (message instanceof CommandInteraction) {
                reply = <Message> await message.fetchReply();
            }

            await pagination.start(reply!);

            return;
        }

        const commandName = options.isInteraction ? options.options.getString('command') : options.args[0];
        const cmd = Help.find(c => c.name === commandName);

        if (!cmd) {
            await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Invalid command \`${commandName}\`.`)
                ]
            });

            return;
        }

        await message.reply({
            embeds: [renderCommandMeta(cmd)]
        });

        // let fields = [
        //     {
        //         name: "Usage",
        //         value: `\`${client.config.get('prefix')}${cmd.name}\`` + (cmd.structure.trim() !== '' ? ` \`${cmd.structure}\`` : '')
        //     },
        //     {
        //         name: 'Examples',
        //         value: cmd.example.replace(/\%\%/g, client.config.get('prefix'))
        //     }
        // ];

        // if (cmd.options !== undefined) {
        //     let str = '';

        //     for (let opt in cmd.options)
        //         str += `\`${opt}\` - ${cmd.options[opt]}\n`;

        //     str = str.substring(0, str.length - 1);

        //     fields.push({
        //         name: 'Options',
        //         value: str
        //     });
        // }

        // if (cmd.notes !== null) {
        //     fields.push({
        //         name: "Notes",
        //         value: cmd.notes
        //     });
        // }

        // await message.reply({
        //     embeds: [
        //         new MessageEmbed()
        //         .setTitle(`${client.config.get('prefix')}${cmd.name}`)
        //         .setDescription("`<...>` means required argument, `[...]` means optional argument.\n\n" + (cmd.description !== null ? cmd.description : cmd.shortBrief))
        //         .addFields(fields)
        //     ]
        // });
    }
}
