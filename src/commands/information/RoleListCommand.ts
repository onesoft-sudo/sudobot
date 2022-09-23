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

import { CommandInteraction, Role } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';

export default class RoleListCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy = false;

    constructor() {
        super('rolelist', 'information', []);
    }

    async run(client: DiscordClient, msg: CommandInteraction, options: InteractionOptions) {
        let role: Role | null = null, page = 1;

        if (options.options.getRole('role'))
            role = <Role> options.options.getRole('role');

        if (options.options.getInteger('page'))
            page = <number> options.options.getInteger('page');
        
        if (!role) {
            const roles = await msg.guild!.roles.cache.toJSON();

            let str = ``;
            let limit = 15, i = 1, offset = (page - 1) * limit;

            if (offset >= roles.length) {
                await msg.reply({
                    content: "Invalid page number.",
                    ephemeral: true
                });

                return;
            }

            for await (const role of roles) {
                if (role.id === msg.guild!.id)
                    continue;
                
                i++;
                
                if (offset >= (i - 1))
                    continue;
                    
                if ((limit + offset) < (i - 1))   
                    break;

                str += `${role.name} - ${role.id} - ${role.members.size} Members - ${role.hexColor}\n`;
            }

            await msg.reply({
                content: "**Role List (" + page + ")**:\n\n```" + str + '```',
            });
        }
        else {
            await msg.reply({
                embeds: [
                    new MessageEmbed()
                    .setAuthor({
                        name: `Role Information`
                    })
                    .setColor(role.hexColor)
                    .addFields([
                        {
                            name: 'Name',
                            value: role.name
                        },
                        {
                            name: 'Color',
                            value: role.hexColor
                        },
                        {
                            name: 'Members',
                            value: role.members.size + ''
                        },
                        {
                            name: 'Bot Role',
                            value: role.members.size === 1 && role.members.first()?.user.bot ? 'Yes' : 'No'
                        }
                    ])
                ]
            });
        }
    }
}