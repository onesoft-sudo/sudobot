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

import { CommandInteraction, GuildMember, Message } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getMember from '../../utils/getMember';

export default class VerifyCommand extends BaseCommand {
    supportsInteractions: boolean = true;

    constructor() {
        super('verify', 'moderation', []);
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

        let member: GuildMember | null | undefined;

        if (options.isInteraction) {
            member = <GuildMember> await options.options.getMember('user');

            if (!member) {
                await msg.reply({
                    content: 'Invalid member given.'
                });

                return;
            }
        }
        else {
            try {
                member = await getMember(msg as Message, options);

                if (!member)    
                    throw new Error();
            }
            catch (e) {
                console.log(e);
                
                await msg.reply({
                    content: 'Invalid member given.'
                });

                return;
            }
        }

        if (member.roles.cache.has(client.config.props[member.guild.id].mod_role)) {
            await msg.reply(`Cannot enforce verification to a moderator.`);
            return;
        }

        // if (member.roles.cache.has(client.config.props[member.guild.id].verification.role)) {
        //     await msg.reply(`Verification is already enforced to this user.`);
        //     return;
        // }

        await client.verification.start(member);

        await msg.reply({
            embeds: [
                new MessageEmbed({
                    author: {
                        name: member.user.tag,
                        iconURL: member.displayAvatarURL()
                    },
                    description: `Verfication has been enforced to this user. They won't be able to access channels or talk unless they verify themselves.`
                })
            ]
        });
    }
}