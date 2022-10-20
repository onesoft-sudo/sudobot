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

import { CommandInteraction, Interaction, Message, Role } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import Pagination from '../../utils/Pagination';
import CommandOptions from '../../types/CommandOptions';
import getRole from '../../utils/getRole';

export default class RoleListCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('rolelist', 'information', []);
    }

    async run(client: DiscordClient, message: CommandInteraction | Message, options: InteractionOptions | CommandOptions) {
        let role: Role | null = null, order = "d";

        if (options.isInteraction && options.options.getRole('role'))
            role = <Role> options.options.getRole('role');
        else if (!options.isInteraction && options.args[0]) 
            role = (await getRole(message as Message, options, 1)) ?? null;

        if (options.isInteraction && options.options.getString('order'))
            order = <string> options.options.getString('order');
        
        if (!role) {
            message instanceof CommandInteraction ? await message.deferReply() : null;

            const roles = message.guild!.roles.cache.sort((role1, role2) => order === 'a' ? role1.position - role2.position : role2.position - role1.position).toJSON();
            const popped = roles.pop();

            if (popped && popped.id !== message.guild!.id) {
                roles.push(popped);
            }

            const pagination = new Pagination(roles, {
                channel_id: message.channel!.id,
                guild_id: message.guild!.id,
                user_id: message.member!.user.id,
                limit: 10,
                timeout: 120_000,
                embedBuilder({ data, currentPage, maxPages }) {
                    let description = '';

                    for (const role of data) {
                        description += `${role} • \`${role.id}\` • ${role.hexColor}\n`;
                        // description += `${role}\n**ID**: ${role.id}\n**Color**: ${role.hexColor}\n**Hoisting**: ${role.hoist ? 'Enabled' : 'Disabled'}\n**Position**: ${role.position}\n\n`;
                    }

                    return new MessageEmbed({
                        author: {
                            name: "Roles",
                            iconURL: message.guild!.iconURL() ?? undefined
                        },
                        description,
                        footer: { text: `Page ${currentPage} of ${maxPages} • ${roles.length} roles total` }
                    });
                },
            });

            let reply = await this.deferReply(message, pagination.getMessageOptions(1));

            if (message instanceof Interaction) {
                reply = (await message.fetchReply()) as Message;
            }

            await pagination.start(reply! as Message);
        }
        else {
            await message.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        name: `Role Information`
                    })
                    .setColor(role.hexColor)
                    .addFields([
                        {
                            name: 'Name',
                            value: role.name,
                            inline: true
                        },
                        {
                            name: 'Color',
                            value: role.hexColor,
                            inline: true
                        },
                        {
                            name: 'Members',
                            value: role.members.size + ''
                        },
                        {
                            name: 'Bot Role',
                            value: role.members.size === 1 && role.members.first()?.user.bot ? 'Yes' : 'No',
                            inline: true
                        }
                    ])
                ]
            });
        }
    }
}
