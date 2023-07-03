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

import { CommandInteraction, Guild, Message, MessageActionRow, MessageSelectMenu, SelectMenuInteraction, TextChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';

export default class AboutCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    ownerOnly: boolean = true;

    constructor() {
        super('setup', 'settings', []);
    }

    async createMutedRole(client: DiscordClient, interaction: SelectMenuInteraction) {
        await interaction.reply({
            content: `${await fetchEmoji('loading')} Creating muted role...`
        });

        const { guild } = interaction;

        if (!guild) {
            return;
        }

        try {
            const role = await guild.roles.create({
                color: 'DARK_GREY',
                mentionable: false,
                name: 'Muted',
                permissions: undefined,
                reason: 'User commanded to create a muted role',
            });

            await new Promise(r => setTimeout(r, 1500));

            await interaction.editReply({
                content: `${await fetchEmoji('check')} Muted role created.\n${await fetchEmoji('loading')} Adding permission override to the channels...`
            });    

            let success = 0, failed = 0;

            for (const channel of guild.channels.cache.values()) {
                try {
                    if (channel.type === 'GUILD_STAGE_VOICE' || channel.type === 'GUILD_VOICE') {
                        await channel.permissionOverwrites.create(role, {
                            ADD_REACTIONS: false,
                            SEND_MESSAGES: false,
                            SEND_MESSAGES_IN_THREADS: false,
                            SPEAK: false,
                            REQUEST_TO_SPEAK: false
                        });
                    }
                    else if (!channel.type.endsWith('_THREAD')) {
                        await (channel as TextChannel).permissionOverwrites.create(role, {
                            ADD_REACTIONS: false,
                            SEND_MESSAGES: false,
                            SEND_MESSAGES_IN_THREADS: false,
                        });
                    }

                    success++;
                }
                catch (e) {
                    console.log(e);
                    failed++;
                }
            }

            await interaction.editReply({ content: `${await fetchEmoji('check')} A new muted role ${role} was created, with ${success} successful and ${failed} failed channel overrides.` });
        }
        catch (e) {
            console.log(e);
            await interaction.editReply({ content: `${await fetchEmoji('error')} An error occured while trying to create the role and applying overrides.` });
        }
    }

    async run(client: DiscordClient, message: Message | CommandInteraction, options: CommandOptions | InteractionOptions) {
        const selectMenuRow = new MessageActionRow<MessageSelectMenu>()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('setup_selectmenu')
                    .setMaxValues(1)
                    .setMinValues(1)
                    .addOptions(
                        {
                            label: 'Create Mute Role',
                            value: 'muterole_create',
                            description: 'Creates a muted role with proper permission overrides'
                        }
                    )
            );

        let reply = <Message> await message.reply({
            embeds: [
                new MessageEmbed({
                    title: 'Setup Options',
                    description: 'Choose a option to start.',
                })
            ],
            components: [selectMenuRow]
        });

        if (message instanceof CommandInteraction) {
            reply = <Message> await message.fetchReply();
        }

        message.channel?.awaitMessageComponent({
            componentType: 'SELECT_MENU',
            time: 120_000,
            dispose: true,
            filter(interaction) {
                return interaction.customId === 'setup_selectmenu' && interaction.user.id === message.member!.user.id;
            },
        })
        .then(interaction => {
            if (interaction.values.includes('muterole_create')) {
                this.createMutedRole(client, interaction);
            }
        })
        .catch(error => {
            console.log(error);
            selectMenuRow.components[0].setDisabled(true);

            reply!.edit({
                components: [selectMenuRow]
            });
        })
    }
}
