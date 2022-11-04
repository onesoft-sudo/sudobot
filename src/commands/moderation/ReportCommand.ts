import { ModalSubmitInteraction } from 'discord-modals';
import { Message, Interaction, CacheType, MessageContextMenuInteraction, Modal, MessageActionRow, TextInputComponent, TextChannel } from 'discord.js';
import DiscordClient from '../../client/Client';
import MessageEmbed from '../../client/MessageEmbed';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import BaseCommand from '../../utils/structures/BaseCommand';

export default class ReportCommand extends BaseCommand {
    name = "Report Message";
    category = "moderation";
    ids: { [randomId: string]: Message } = {};
    supportsInteractions = true;
    supportsContextMenu = true;

    async modalSubmit(client: DiscordClient, interaction: ModalSubmitInteraction): Promise<void> {
        const { customId, guild } = interaction;
        const targetMessage = this.ids[customId];

        if (!targetMessage) {
            await interaction.reply({ content: "Whoops! Something unexpected happened here! Please try again", ephemeral: true });
            return;
        }

        try {
            const { logging_channel } = client.config.props[guild!.id] ?? {};
            const channel = <TextChannel> await guild!.channels.fetch(logging_channel);

            if (channel && channel.send) {
                await channel.send({
                    embeds: [
                        new MessageEmbed({
                            author: {
                                name: targetMessage.author.tag,
                                iconURL: targetMessage.author.displayAvatarURL(),
                            },
                            description: targetMessage.content ?? '*No Content*',
                            title: 'Message Reported',
                            fields: [
                                {
                                    name: "Reported by",
                                    value: interaction.user!.tag
                                }
                            ],
                            footer: {
                                text: 'Report Received'
                            }
                        })
                        .setTimestamp()
                        .setColor('#f14a60')
                    ],
                    files: [...targetMessage.attachments.values()],
                    stickers: [...targetMessage.stickers.values()]
                });
            }
        }
        catch (e) {
            console.log(e);
            await interaction.reply({ content: "Could not report that message. An internal error has occurred.", ephemeral: true });
            return;
        }

        try {
            await targetMessage.delete();
        }
        catch (e) {
            await interaction.reply({ content: "Could not remove that message. Probably the author has deleted it or I don't have enough permissions.", ephemeral: true });
            return;
        }

        await interaction.reply({ content: "The message has been reported. Moderators will take action soon.", ephemeral: true });
    }

    async run(client: DiscordClient, interaction: MessageContextMenuInteraction, options: InteractionOptions): Promise<void> {
        const randomId = 'report_modal_' + Math.round(Math.random() * 10000000);
        const { targetMessage } = interaction;
        const modal = new Modal()
            .setCustomId(randomId)
            .setTitle("Report Message")
            .addComponents(
                new MessageActionRow<TextInputComponent>()
                    .addComponents(
                        new TextInputComponent()
                            .setCustomId('reason')
                            .setLabel("Reason")
                            .setPlaceholder("Why are you reporting this message?")
                            .setMinLength(1)
                            .setRequired(true)
                            .setStyle('PARAGRAPH')
                    )
            );

        await interaction.showModal(modal);
        this.ids[randomId] = targetMessage as Message;
    }
}