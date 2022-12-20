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
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import GuildInfo from '../../models/GuildInfo';

export default class StatsCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('stats', 'information', []);
    }

    async run(client: DiscordClient, msg: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const info = await GuildInfo.findOneAndUpdate({ 
            guild_id: msg.guild!.id 
        }, {}, {
            new: true,
            upsert: true
        });

        let members = 0;
        let bots = 0;
        
        msg.guild!.members.cache.forEach(m => {
            if (m.user.bot)
                bots++;
            else 
                members++;
        });
        
        await msg.reply({
            embeds: [
                new MessageEmbed()
                .setAuthor({
                    name: msg.guild!.name,
                    iconURL: msg.guild!.iconURL()!,
                })
                .addFields([
                    {
                        name: "Members",
                        inline: true,
                        value: members + ''
                    },
                    {
                        name: "Bots",
                        inline: true,
                        value: bots + ''
                    },
                    {
                        name: "Total Members",
                        inline: true,
                        value: (members + bots) + ''
                    },
                    {
                        name: "Total Members Joined",
                        inline: true,
                        value: info.totalMembersJoined + ''
                    }
                ])
                .addField('Roles', msg.guild!.roles.cache.size + '')
                .addField('Text Channels', msg.guild!.channels.cache.filter(c => c.type === 'GUILD_TEXT').size + '')
                .addField('Emojis', msg.guild!.emojis.cache.size + '')
                .addField('Stickers', msg.guild!.stickers?.cache.size + '')
            ]
        });
    }
}