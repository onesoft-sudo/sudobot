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

import { CommandInteraction, Interaction, InteractionCollector, Message, MessageActionRow, MessageButton, Permissions, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import getUser from '../../utils/getUser';
import Note from '../../models/Note';

export default class NotesCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    constructor() {
        super('notes', 'moderation', []);
    }

    async genEmbed(client: DiscordClient, msg: Message | Interaction, user: User, page: number = 1) {
        const limit = 5;
        const offset = ((page < 1 ? 1 : page) - 1) * limit;

        const notes = await Note.find({
            guild_id: msg.guild!.id,
            user_id: user.id,
        }).skip(offset).limit(limit).sort("createdAt");

        let str = '';
        
        const maxPage = Math.ceil((await Note.count({
            guild_id: msg.guild!.id,
            user_id: user.id,
        })) / limit);

        for await (const note of notes) {
            str += `**Note ID**: ${note.id}\n`;
            str += `Note taken by: ${note.mod_tag}\n`;
            str += `Date: ${note.createdAt.toLocaleString()}\n`;
            str += `Content:\n\`\`\`\n${note.content}\n\`\`\`\n`;
            str += '\n';
        }

        return {
            embeds: [
                new MessageEmbed({
                    author: {
                        name: user.tag,
                        iconURL: user.displayAvatarURL()
                    },
                    title: 'Notes',
                    description: str === '' ? 'No notes.' : str,
                    timestamp: new Date(),
                })
            ],
            components: [
                this.createActionRow(page, maxPage)
            ]
        };
    }

    createActionRow(page: number, max: number) {
        console.log(max);
        
        const back = new MessageButton({
            customId: 'notes-back-',
            label: '<<',
            style: 'PRIMARY'
        });

        const next = new MessageButton({
            customId: 'notes-next-',
            label: '>>',
            style: 'PRIMARY'
        });

        let nextPage = page + 1;
        console.log(nextPage);

        if (nextPage > max) {
            nextPage = max;
            next.setDisabled(true);
        }
        else {
            next.setDisabled(false);
        }

        let prevPage = page - 1;
        console.log(prevPage);

        if (prevPage <= 0) {
            prevPage = 1;
            back.setDisabled(true);
        }
        else {
            back.setDisabled(false);
        }

        next.setCustomId('notes-next-' + nextPage);
        back.setCustomId('notes-back-' + prevPage);

        return new MessageActionRow()
            .addComponents(
                back,
                next
            );
    }

    async update(client: DiscordClient, interaction: Interaction, message: Message) {
        console.log('here');
        
        if (interaction.isButton() && interaction.customId.startsWith('notes-')) {
            const splitted = interaction.customId.split('-');

            if (splitted[2] === undefined || isNaN(parseInt(splitted[2]))) 
                return;

            if (splitted[1] === 'next' || splitted[1] === 'back') {
                const options = await this.genEmbed(client, interaction, (global as any).user, parseInt(splitted[2]));
                
                try {
                    await interaction.update(options);
                }
                catch (e) {
                    console.log(e);                    
                }
            }
        }
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

        let user: User | null | undefined;

        if (options.isInteraction) {
            user = await <User> options.options.getUser('user');
        }
        else {
            try {
                user = await getUser(client, msg as Message, options);

                if (!user) 
                    throw new Error();
            }
            catch (e) {
                console.log(e);
                
                await msg.reply({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Invalid user given.`)
                    ]
                });

                return;
            }
        }

        (global as any).user = user;

        let message = <Message> await msg.reply(await this.genEmbed(client, msg, user));

        if (msg instanceof CommandInteraction)
            message = <Message> await msg.fetchReply();

        const collector = new InteractionCollector(client, {
            guild: msg.guild!,
            channel: msg.channel!,
            max: 20,
            componentType: 'BUTTON',
            interactionType: 'MESSAGE_COMPONENT',
            message,
            time: 30000,
            filter(i) {
                return i.isButton() && i.member?.user.id === msg.member!.user.id;
            }
        });

        collector.on('collect', async i => {
            await this.update(client, i, message);
        });

        collector.on('end', async () => {
            try {
                await message.edit({
                    components: []
                });
            }
            catch (e) {
                console.log(e);                
            }
        });
    }
}
