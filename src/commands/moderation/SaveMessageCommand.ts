/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { ApplicationCommandType, EmbedBuilder, MessageContextMenuCommandInteraction, PermissionsBitField } from "discord.js";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/Logger";
import { channelInfo, messageInfo, userInfo } from "../../utils/embed";
import { safeChannelFetch } from "../../utils/fetch";

export default class SaveMessageCommand extends Command {
    public readonly name = "Save Message";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly applicationCommandType = ApplicationCommandType.Message;

    public readonly supportsLegacy = false;
    public readonly description = "Saves the target message to the message log channel";

    async execute(interaction: MessageContextMenuCommandInteraction): Promise<CommandReturn> {
        const { targetMessage } = interaction;

        await interaction.deferReply({ ephemeral: true });

        if (!this.client.configManager.config[interaction.guildId!]?.logging?.enabled) {
            await interaction.editReply({
                content: "This server has logging turned off. Please turn it on to use this command."
            });

            return;
        }

        const channelId =
            this.client.configManager.config[interaction.guildId!]?.logging?.saved_messages_channel ??
            this.client.configManager.config[interaction.guildId!]?.logging?.primary_channel;

        if (!channelId) {
            await interaction.editReply({
                content: "This server does not have logging channel set up. Please set it up first."
            });

            return;
        }

        const channel = await safeChannelFetch(interaction.guild!, channelId!);

        if (!channel?.isTextBased()) {
            await interaction.editReply({
                content: "Could not send the saved message to the log channel. This is probably due to a misconfiguration."
            });
            return;
        }

        let url = "";

        try {
            url = (
                await channel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: 0x007bff,
                            title: "Message saved",
                            author: {
                                name: targetMessage.author.username,
                                icon_url: targetMessage.author.displayAvatarURL()
                            },
                            description: targetMessage.content ?? "No content",
                            fields: [
                                {
                                    name: "User",
                                    value: userInfo(targetMessage.author),
                                    inline: true
                                },
                                {
                                    name: "Saved By",
                                    value: userInfo(interaction.user),
                                    inline: true
                                },
                                {
                                    name: "Message",
                                    value: messageInfo(targetMessage)
                                },
                                {
                                    name: "Channel",
                                    value: channelInfo(targetMessage.channel)
                                }
                            ],
                            footer: {
                                text: "Saved"
                            }
                        }).setTimestamp()
                    ],
                    files: targetMessage.attachments.toJSON()
                })
            ).url;
        } catch (e) {
            logError(e);
            await this.error(
                interaction,
                "Could not send the saved message into the log channel! Make sure I have enough permissions."
            );
            return;
        }

        await this.success(interaction, `The message was saved. [Click here](${url}) to nagivate to the saved message.`);
    }
}
