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

import { ModalSubmitInteraction } from 'discord-modals';
import { Message, Interaction, CacheType, MessageContextMenuInteraction, Modal, MessageActionRow, TextInputComponent, TextChannel, GuildMember } from 'discord.js';
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
        if (!(await this.verify(client, interaction))) {
            return;
        }

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

    async verify(client: DiscordClient, interaction: MessageContextMenuInteraction | ModalSubmitInteraction) {
        const member = interaction.member as GuildMember;
        const config = client.config.props[member.guild.id].reports;

        if (!config.enabled) {
            await interaction.reply({ ephemeral: true, content: "Message reports are disabled in this server." });
            return false;
        }

        if (config.mod_only && member.roles.cache.has(client.config.props[(interaction.member as GuildMember).guild.id].mod_role)) {
            return true;
        }

        for (const roleID of config.reporter_roles) {
            if (roleID === 'everyone') {
                return true;
            }
            
            if (member.roles.cache.has(roleID)) {
                return true;
            }
        }

        if (config.reporters.includes(interaction.member!.user.id)) {
            return true;
        }
        
        await interaction.reply({ ephemeral: true, content: "You're not permitted to report messages." });
        return false;
    }

    async run(client: DiscordClient, interaction: MessageContextMenuInteraction, options: InteractionOptions): Promise<void> {
        if (!(await this.verify(client, interaction))) {
            return;
        }

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