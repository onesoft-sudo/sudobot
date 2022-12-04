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
import { GuildMember, Interaction, MessageEmbed } from 'discord.js';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import AutoCompleteOptions from '../../types/AutoCompleteOptions';

export default class InteractionCreateEvent extends BaseEvent {
    constructor() {
        super('interactionCreate');
    }

    async run(client: DiscordClient, interaction: Interaction) {
        if (!interaction.guild || !interaction.channel || interaction.channel.type === 'DM') {
            if (interaction.isRepliable())
                await interaction.reply({
                    content: 'You cannot use this bot on DMs.',
                    ephemeral: true
                }); 

            return;
        }

        if (interaction.isButton()) {
            await client.interactionRoleManager.onButtonInteraction(interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            await (client.commands.get('Send Reply') as any)?.innerRun(interaction);
            return;
        }

        if (interaction.isCommand() || interaction.isContextMenu()) {
            await client.setMessage(interaction);

            const { commandName } = interaction;

            const command = await client.commands.get(commandName);

            if (command && ((interaction.isCommand() && command.supportsInteractions) || (interaction.isContextMenu() && command.supportsContextMenu))) {
                const allowed = await client.auth.verify(interaction.member! as GuildMember, command);

                if (!allowed) {
                    await interaction.reply({
                        embeds: [
                            new MessageEmbed()
                            .setColor('#f14a60')
                            .setDescription(":x: You don't have permission to run this command.")
                        ],
                        ephemeral: true
                    });

                    return;
                }

                const options = {
                    cmdName: commandName,
                    options: interaction.options,
                    isInteraction: true
                } as InteractionOptions;

                await command.execute(client, interaction, options);
                (global as any).lastCommand = commandName;
            }
        }
        else if (interaction.isAutocomplete()) {
            await client.setMessage(interaction);

            const { commandName } = interaction;

            const command = await client.commands.get(commandName);

            if (command && command.supportsInteractions) {
                const allowed = await client.auth.verify(interaction.member! as GuildMember, command);

                if (!allowed) {
                    return;
                }

                if (!(await command.perms(client, interaction))) {
                    return;
                }

                const options = {
                    cmdName: commandName,
                    options: interaction.options,
                    isInteraction: true,
                    optionName: interaction.options.getFocused(true).name,
                    query: interaction.options.getFocused(true).value.toString()
                } as AutoCompleteOptions;

                await command.autoComplete(client, interaction, options);
                (global as any).lastCommand = commandName;
            }
        }
        else {
            if (!(global as any).commandName)
                return;

            await client.setMessage(interaction);

            const command = await client.commands.get((global as any).commandName);

            if (command && command.supportsInteractions) {
                const allowed = await client.auth.verify(interaction.member! as GuildMember, command);

                if (!allowed) {
                    return;
                }
                
                if (!(await command.perms(client, interaction))) {
                    return;
                }

                await command.default(client, interaction);
            }
        }
    }
}