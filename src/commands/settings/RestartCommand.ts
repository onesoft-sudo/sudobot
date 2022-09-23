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

import { CommandInteraction, InteractionCollector, Message, MessageActionRow, MessageButton } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { MessageButtonStyles } from 'discord.js/typings/enums';
import { fetchEmoji } from '../../utils/Emoji';

export default class RestartCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy = false;
    ownerOnly = true;

    constructor() {
        super('restart', 'settings', []);
    }

    async run(client: DiscordClient, interaction: CommandInteraction, options: InteractionOptions) {
        const row = new MessageActionRow();

        row.addComponents([
            new MessageButton()
            .setCustomId('restart:true')
            .setLabel('Yes')
            .setStyle(MessageButtonStyles.SUCCESS),
            new MessageButton()
            .setCustomId('restart:false')
            .setLabel('No')
            .setStyle(MessageButtonStyles.DANGER)
        ]);

        const disabledRow = new MessageActionRow();

        await disabledRow.addComponents([
            new MessageButton()
            .setCustomId('restart:true')
            .setLabel('Restart')
            .setStyle(MessageButtonStyles.SUCCESS)
            .setDisabled(true),
            new MessageButton()
            .setCustomId('restart:false')
            .setLabel('Cancel')
            .setStyle(MessageButtonStyles.DANGER)
            .setDisabled(true)
        ]);

        await interaction.reply({
            embeds: [
                new MessageEmbed()
                .setTitle('System Restart')
                .setDescription('Are you sure to restart the system? This will restart the whole bot system including the backend API and might take up to a minute.')
            ],
            components: [row]
        });

        const reply = <Message> await interaction.fetchReply();

        const collector = new InteractionCollector(client, {
            channel: reply.channel,
            message: reply,
            componentType: 'BUTTON',
            interactionType: 'MESSAGE_COMPONENT',
            filter(i) {
                return i.isButton() && i.customId.startsWith('restart');
            },
            time: 15000
        });

        collector.on('collect', async i => {
            if (!i.isButton())
                return;
            
            if (i.member!.user.id !== interaction.member!.user.id) {
                await i.reply({
                    content: 'That\'s not your button.',
                    ephemeral: true
                });

                return;
            }

            if (i.customId === 'restart:true') {
                await i.update({
                    embeds: [
                        new MessageEmbed()
                        .setColor('#007bff')
                        .setTitle('System Restart')
                        .setDescription((await fetchEmoji('loading'))!.toString() + ' Restarting...')
                    ],
                    components: [disabledRow]
                });

                await client.startupManager.createLockFile({
                    date: new Date().toISOString(),
                    guild_id: i.guild!.id,
                    channel_id: i.channel!.id,
                    message_id: reply.id
                });

                await process.exit(0);
            }
            else {
                await i.update({
                    embeds: [
                        new MessageEmbed()
                        .setColor('GREY')
                        .setTitle('System Restart')
                        .setDescription('This action has been canceled.')
                    ],
                    components: [disabledRow]
                });
            }
        });

        collector.on('end', async i => {
            if (reply.embeds[0].hexColor === '#007bff') {
                await reply.edit({
                    embeds: [
                        new MessageEmbed()
                        .setColor('GREY')
                        .setTitle('System Restart')
                        .setDescription('This action has been canceled due to inactivity.')
                    ],
                    components: [disabledRow]
                });
            }
        });

        // reply.awaitMessageComponent({
        //     componentType: 'BUTTON',
        //     filter(i) {
        //         return i.customId.startsWith('restart') && i.member!.user.id === interaction.member!.user.id;
        //     },
        //     time: 15000
        // })
        // .then(async i => {
        //     if (i.customId === 'restart:true') {
        //         await i.update({
        //             embeds: [
        //                 new MessageEmbed()
        //                 .setColor('#007bff')
        //                 .setTitle('System Restart')
        //                 .setDescription((await fetchEmoji('loading'))!.toString() + ' Restarting...')
        //             ],
        //             components: [disabledRow]
        //         });

        //         await client.startupManager.createLockFile({
        //             date: new Date().toISOString(),
        //             guild_id: i.guild!.id,
        //             channel_id: i.channel!.id,
        //             message_id: reply.id
        //         });

        //         await process.exit(0);
        //     }
        //     else {
        //         await i.update({
        //             embeds: [
        //                 new MessageEmbed()
        //                 .setColor('GREY')
        //                 .setTitle('System Restart')
        //                 .setDescription('This action has been canceled.')
        //             ],
        //             components: [disabledRow]
        //         });
        //     }
        // })
        // .catch(async e => {
        //     console.log(e);
           
        //     await reply.edit({
        //         embeds: [
        //             new MessageEmbed()
        //             .setColor('GREY')
        //             .setTitle('System Restart')
        //             .setDescription('This action has been canceled due to inactivity.')
        //         ],
        //         components: [disabledRow]
        //     });
        // });
    }
}