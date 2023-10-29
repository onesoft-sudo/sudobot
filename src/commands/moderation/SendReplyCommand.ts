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

import {
    ActionRowBuilder,
    ApplicationCommandType,
    CacheType,
    Interaction,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    PermissionsBitField,
    TextInputBuilder,
    TextInputStyle,
    User
} from "discord.js";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";
import EmbedSchemaParser from "../../utils/EmbedSchemaParser";
import { channelInfo, userInfo } from "../../utils/embed";
import { safeChannelFetch } from "../../utils/fetch";
import { logError } from "../../utils/logger";

export default class SendReplyCommand extends Command implements HasEventListeners {
    public readonly name = "Send Reply";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly applicationCommandType = ApplicationCommandType.Message;
    public readonly supportsLegacy = false;

    public readonly description = "Sends a reply to a message.";

    @GatewayEventListener("interactionCreate")
    async onInteractionCreate(interaction: Interaction<CacheType>) {
        if (!interaction.isModalSubmit() || !interaction.customId.startsWith("sendreply__")) {
            return;
        }

        const echoMentions = this.client.configManager.config[interaction.guildId!]?.commands?.echo_mentions ?? false;

        await interaction
            .deferReply({
                ephemeral: true
            })
            .catch(logError);

        const [, id] = interaction.customId.split("__");
        const options = {
            reply: {
                messageReference: id,
                failIfNotExists: true
            },
            content: interaction.fields.getTextInputValue("content"),
            allowedMentions: (interaction.member?.permissions as Readonly<PermissionsBitField>)?.has("MentionEveryone", true)
                ? undefined
                : echoMentions
                ? undefined
                : {
                      parse: ["users" as const]
                  }
        };
        let messageId: string | undefined = undefined;

        if (interaction.channel) {
            messageId = (await EmbedSchemaParser.sendMessage(interaction.channel, options).catch(logError))?.id;
        }

        await interaction
            .editReply({
                content: `${this.emoji("check")} Reply sent successfully.`
            })
            .catch(logError);

        if (!this.client.configManager.systemConfig.logging?.enabled) {
            return;
        }

        const logChannelId = this.client.configManager.systemConfig.logging?.channels?.echo_send_logs;

        if (logChannelId) {
            safeChannelFetch(await this.client.getHomeGuild(), logChannelId)
                .then(async channel => {
                    if (channel?.isTextBased()) {
                        const sentMessage = await EmbedSchemaParser.sendMessage(channel, options).catch(logError);

                        if (!sentMessage) {
                            return;
                        }

                        await channel
                            ?.send({
                                embeds: [
                                    {
                                        title: "The Send Reply command was executed",
                                        author: {
                                            name: interaction.member!.user.username,
                                            icon_url: (interaction.member!.user as User).displayAvatarURL?.()
                                        },
                                        description: `The message is [above](${sentMessage.url}).`,
                                        fields: [
                                            {
                                                name: "Guild",
                                                value: `${interaction.guild!.name} (${interaction.guild!.id})`,
                                                inline: true
                                            },

                                            {
                                                name: "Channel",
                                                value: channelInfo(interaction.channel!),
                                                inline: true
                                            },
                                            {
                                                name: "Mode",
                                                value: "Application Command"
                                            },
                                            {
                                                name: "User",
                                                value: userInfo(interaction.member!.user as User),
                                                inline: true
                                            },
                                            {
                                                name: "Message",
                                                value: messageId
                                                    ? `[Click here](https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${messageId})`
                                                    : "*Not available*"
                                            }
                                        ],
                                        footer: {
                                            text: "Logged"
                                        },
                                        timestamp: new Date().toISOString(),
                                        color: 0x007bff
                                    }
                                ]
                            })
                            .catch(logError);
                    }
                })
                .catch(logError);
        }
    }

    async execute(interaction: MessageContextMenuCommandInteraction): Promise<CommandReturn> {
        const modal = new ModalBuilder()
            .setCustomId(`sendreply__${interaction.targetMessage.id}`)
            .setTitle("Send Reply")
            .setComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("content")
                        .setLabel("Content")
                        .setPlaceholder("Type the message content here...")
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph)
                )
            );

        await interaction.showModal(modal).catch(logError);
    }
}
