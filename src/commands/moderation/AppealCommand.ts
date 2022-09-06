import { CommandInteraction } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import { Modal, ModalSubmitInteraction, showModal, TextInputComponent } from 'discord-modals';
import PunishmentAppeal from '../../models/PunishmentAppeal';

export default class AppealCommand extends BaseCommand {
    supportsInteractions: boolean = true;
    supportsLegacy = false;

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