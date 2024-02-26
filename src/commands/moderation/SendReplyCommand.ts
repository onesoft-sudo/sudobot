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
    APIEmbed,
    ActionRowBuilder,
    ApplicationCommandType,
    CacheType,
    Interaction,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    PermissionsBitField,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";
import EmbedSchemaParser from "../../utils/EmbedSchemaParser";
import { logError } from "../../utils/Logger";

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
                content: `${this.emoji(messageId ? "check" : "error")} ${
                    messageId ? "Reply sent successfully" : "Failed to send reply. Make sure it's a valid and reply-able message"
                }.`
            })
            .catch(logError);

        const embed: APIEmbed = {};

        await this.sendCommandRanLog(interaction, embed, {
            previews: [options],
            async before(channel, sentMessages) {
                embed.description = `The message preview is [above](${sentMessages[0]?.url}).`;
                this.url = messageId
                    ? `[Click here](https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${messageId})`
                    : "*Not available*";
            }
        });
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
