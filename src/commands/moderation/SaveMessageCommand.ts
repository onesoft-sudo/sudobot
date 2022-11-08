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

import { ContextMenuInteraction, Message } from "discord.js";
import DiscordClient from "../../client/Client";
import MessageEmbed from "../../client/MessageEmbed";
import BaseCommand from "../../utils/structures/BaseCommand";

export default class SaveMessageCommand extends BaseCommand {
    supportsContextMenu: boolean = true;
    supportsLegacy = false;

    constructor() {
        super('Save Message', 'moderation', []);
    }

    async run(client: DiscordClient, interaction: ContextMenuInteraction): Promise<void> {
        if (!interaction.isMessageContextMenu() || !interaction.targetMessage) {
            await interaction.reply({ content: "The interaction payload is corrupted.", ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        const { targetMessage, guild } = interaction;
        const message = targetMessage as Message;

        try {
            const channel = await guild?.channels.fetch(client.config.props[guild!.id].message_save_channel ?? client.config.props[guild!.id].logging_channel);

            if (!channel || channel.type !== 'GUILD_TEXT') {
                throw new Error("Channel not found");
            }

            const savedMessage = await channel.send({
                embeds: [
                    new MessageEmbed({
                        title: 'Message saved',
                        author: {
                            name: message.author.tag,
                            iconURL: message.author.displayAvatarURL(),
                        },
                        color: 0x007bff,
                        description: message.content ?? '*No content*',
                        fields: [
                            {
                                name: 'Channel',
                                value: `${message.channel.toString()}`
                            },
                            {
                                name: 'Saved by',
                                value: `${interaction.member!.user.toString()}`
                            }
                        ],
                        footer: {
                            text: `Saved • Attachments might appear at the top of this embed`
                        }
                    })
                    .setTimestamp()
                ],
                files: [...message.attachments.values()],
                stickers: [...message.stickers.values()]
            });

            await interaction.editReply({ content: `The message was successfully saved! [Click here](${savedMessage.url}) to jump to the saved message.` });
        }
        catch (e) {
            console.log(e);
            await interaction.editReply({ content: "The interaction payload is corrupted." });
        }
    }
}