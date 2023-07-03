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

import { CommandInteraction, ContextMenuInteraction, Message, MessageActionRow, Modal, ModalSubmitInteraction, NewsChannel, Permissions, TextChannel, TextInputComponent, ThreadChannel, User } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { LogLevel } from '../../services/DebugLogger';

let globalInteraction: CommandInteraction | ContextMenuInteraction;
let globalMessage: Message;

export default class SendReplyCommand extends BaseCommand {
    supportsContextMenu: boolean = true;
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;
    permissions = [Permissions.FLAGS.MANAGE_MESSAGES];

    constructor() {
        super('reply', 'moderation', ['Send Reply']);
    }

    async innerRun(interaction: ModalSubmitInteraction) {
        if (!this.filter(interaction)) {
            return;
        }
        
        try {                
            await (globalMessage.channel as TextChannel).sendTyping();
            await globalMessage.reply({ content: interaction.fields.getTextInputValue('content') });
            await interaction.reply({ ephemeral: true, content: "Message sent!" });
        }
        catch (e) {
            console.log(e);
            
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                    .setColor('#f14a60')
                    .setDescription(`Failed to send message. Maybe missing permissions or invalid embed schema?`)
                ],
                ephemeral: true
            });

            return;
        }
    }

    filter(i: ModalSubmitInteraction) {
        return i.user.id === globalInteraction.user.id && i.customId === 'send_reply_modal';
    }

    async run(client: DiscordClient, interaction: CommandInteraction | ContextMenuInteraction, options: InteractionOptions) {
        let message: Message;

        if (interaction.isMessageContextMenu()) {
            globalInteraction = interaction;
            message = <Message> interaction.targetMessage;
            globalMessage = message;
            
            const modal = new Modal()
                .setCustomId("send_reply_modal")
                .setTitle("Send Reply")
                .addComponents(
                    new MessageActionRow<TextInputComponent>()
                        .addComponents(
                            new TextInputComponent()
                                .setCustomId("content")
                                .setLabel("Message Content")
                                .setMinLength(1)
                                .setPlaceholder("Type your message...")
                                .setRequired(true)
                                .setStyle("PARAGRAPH")
                        )
                );

            await interaction.showModal(modal);
        }
        else if (interaction.isCommand()) {
            const channel = <TextChannel | NewsChannel | ThreadChannel> interaction.options.getChannel("channel") ?? interaction.channel!;

            if (channel.type !== 'GUILD_NEWS' && channel.type !== "GUILD_TEXT" && !channel.type.toString().endsWith('_THREAD')) {
                await interaction.reply({ content: "You must select a valid text channel, where the bot can send messages.", ephemeral: true });
                return;
            }
            
            await interaction.deferReply({ ephemeral: true });

            try {
                message = await channel.messages.fetch(interaction.options.getString("message_id", true));

                if (!message) {
                    throw new Error();
                }
            }
            catch (e) {
                console.log(e);

                await this.deferReply(interaction, {
                    content: "No such message found with the given ID."
                });

                return;
            }

            const content = interaction.options.getString("content", true);

            const log = `======== ${(interaction.member!.user as User).tag} (ID: ${(interaction.member!.user as User).id}) executed send reply command (Guild: ${interaction.guildId}) =====`;
            console.log(log);
            client.debugLogger.logApp(LogLevel.INFO, log);
            
            try {                
                await message.reply({ content });
                await this.deferReply(interaction, {
                    content: "Reply sent!"
                });
            }
            catch (e) {
                console.log(e);
                
                await this.deferReply(interaction, {
                    embeds: [
                        new MessageEmbed()
                        .setColor('#f14a60')
                        .setDescription(`Failed to send message. Maybe missing permissions or invalid embed schema?`)
                    ],
                });

                return;
            }
        }
    }
}