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

import { CommandInteraction, ContextMenuInteraction, EmojiIdentifierResolvable, FileOptions, Message, MessageActionRow, Modal, NewsChannel, TextChannel, TextInputComponent, ThreadChannel } from 'discord.js';
import BaseCommand from '../../utils/structures/BaseCommand';
import DiscordClient from '../../client/Client';
import CommandOptions from '../../types/CommandOptions';
import InteractionOptions from '../../types/InteractionOptions';
import MessageEmbed from '../../client/MessageEmbed';
import { fetchEmoji } from '../../utils/Emoji';
import { parseEmbedsInString } from '../../utils/util';

export default class SendReplyCommand extends BaseCommand {
    supportsContextMenu: boolean = true;
    supportsInteractions: boolean = true;
    supportsLegacy: boolean = false;

    constructor() {
        super('reply', 'moderation', ['Send Reply']);
    }

    async run(client: DiscordClient, interaction: CommandInteraction | ContextMenuInteraction, options: InteractionOptions) {
        let message: Message;

        if (interaction.isMessageContextMenu()) {
            message = <Message> interaction.targetMessage;
            
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

            interaction.awaitModalSubmit({
                dispose: true,
                time: 180_000,
                filter(i) {
                    return i.user.id === interaction.user.id && i.customId === 'send_reply_modal';
                }
            })
            .then(async interaction => {
                try {                
                    await (message.channel as TextChannel).sendTyping();
                    await message.reply({ content: interaction.fields.getTextInputValue('content') });
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
            })
            .catch(console.error);
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