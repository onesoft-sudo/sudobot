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

import { Message, Interaction, CacheType, CommandInteraction, Util, CategoryChannel, GuildMember, OverwriteResolvable, Permissions } from "discord.js";
import Client from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import CommandOptions from "../../types/CommandOptions";
import InteractionOptions from "../../types/InteractionOptions";
import reply from "../../utils/embeds/reply";
import { emoji, fetchEmoji } from "../../utils/Emoji";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class PrivateChannelCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.MANAGE_CHANNELS];

    constructor() {
        super('privatechannel', 'utils', ['private', 'createpch']);
    }

    async run(client: Client, message: CommandInteraction<CacheType> | Message<boolean>, options: CommandOptions | InteractionOptions): Promise<void> {
        if (!options.isInteraction && options.args[0] === undefined) {
            await message.reply({
                content: `${await fetchEmoji('error')} You must specify at least a single user to create a private channel.`,
                ephemeral: true
            });

            return;
        }

        if (message instanceof CommandInteraction) {
            await message.deferReply({ ephemeral: true });
        }

        const users: GuildMember[] = [];
        let categoryChannel: CategoryChannel | null = null;

        if (message instanceof Message && !options.isInteraction) {
            if (message.mentions.members) {
                for (const user of message.mentions.members.values()) {
                    users.push(user);
                }
            }

            const { args } = options;

            for (const arg of args) {
                if (arg === '--category' || arg === '-c') {
                    const index = args.indexOf(arg) + 1;
                    
                    if (args[index] === undefined || !/^\d+$/.test(args[index])) {
                        await message.reply(`${await fetchEmoji('error')} You must specify a valid category channel ID after the \`${arg}\` option.`);
                        return;
                    }

                    const channel = await message.guild!.channels.fetch(args[index]);

                    if (channel?.type !== 'GUILD_CATEGORY') {
                        await message.reply(`${await fetchEmoji('error')} The given channel is not a category.`);
                        return;
                    }

                    categoryChannel = channel;

                    break;
                }
                
                let id: string;

                if (arg.startsWith('<@') && arg.endsWith('>')) {
                    id = arg.substring(arg.startsWith('<@!') ? 2 : 1, arg.length - 1);
                }
                else {
                    id = arg;
                }

                if (!/^\d+$/.test(id) || users.find(u => u.id === id)) {
                    continue;
                }

                try {
                    const user = await message.guild!.members.fetch(id);
                    
                    if (user) {
                        users.push(user);
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
        else if (message instanceof CommandInteraction) {
            const member = message.options.getMember('member', true);

            if (!member) {
                return;
            }

            users.push(member as GuildMember);

            const channel = message.options.getChannel('category');

            if (channel && channel.type !== 'GUILD_CATEGORY') {
                await this.deferReply(message, `${await fetchEmoji('error')} You must specify a category channel!`);
                return;
            }

            if (channel) {
                categoryChannel = channel;
            }
        }

        if (users.length < 1) {
            await this.deferReply(message, `${await fetchEmoji('error')} You must specify at least a single user to create a private channel.`);
            return;
        }

        try {
            const channel = await message.guild!.channels.create(users[0].user.tag.replace('#', '-'), {
                type: 'GUILD_TEXT',
                parent: categoryChannel ?? undefined,
                reason: 'User commanded to do so',
                topic: `Private channel for ${users.map(u => u.user.tag).join(', ')}`,
                permissionOverwrites: [
                    {
                        id: message.member!.user.id,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ADD_REACTIONS']
                    },
                    ...users.map(user => ({
                        id: user.id,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ADD_REACTIONS']
                    } as OverwriteResolvable)),
                    {
                        id: message.guild!.id,
                        deny: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ADD_REACTIONS']
                    } 
                ]
            });

            await this.deferReply(message, {
                embeds: [
                    reply(`A private channel ${channel} has been created for the following user(s): ${users.map(u => u.toString()).join(', ')}`)
                ]
            });
        }
        catch (e) {
            console.log(e);
        }
    }
}