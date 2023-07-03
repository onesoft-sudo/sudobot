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

import { CommandInteraction } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import { Modal, ModalSubmitInteraction, showModal, TextInputComponent } from 'discord-modals';
import PunishmentAppeal from '../../models/PunishmentAppeal';

export default class AppealCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy = false;
    ownerOnly: boolean = true; // since this is an incomplete command

    constructor() {
        super('appeal', 'moderation', []);
    }

    async modalSubmit(client: DiscordClient, interaction: ModalSubmitInteraction) {
        if (interaction.customId === 'appeal-modal') {
            const content = interaction.getTextInputValue('appeal-content');

            await PunishmentAppeal.create({
                user_id: interaction.member.id,
                guild_id: interaction.guild!.id,
                content,
                createdAt: new Date()
            });

            await interaction.reply({
                content: 'Your message was submitted successfully!',
                ephemeral: true
            });
        }
    }

    async run(client: DiscordClient, interaction: CommandInteraction, options: InteractionOptions) {
        const existingData = await PunishmentAppeal.findOne({
            user_id: interaction.member!.user.id,
            guild_id: interaction.guild!.id
        });

        if (!existingData) {
            const modal = new Modal()
                .setCustomId('appeal-modal')
                .setTitle('Punishment Appeal Contact')
                .addComponents(
                    new TextInputComponent()
                        .setCustomId('appeal-content')
                        .setLabel('Your message')
                        .setStyle('LONG')
                        .setMinLength(4)
                        .setRequired(true),
                );

            await showModal(modal, {
                client,
                interaction,
            });
        }
        else {
            await interaction.reply({
                content: "You already submitted a punishment appeal.",
                ephemeral: true
            });
        }
    }
}