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
import { logError } from "../../components/log/Logger";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";
import EmbedSchemaParser from "../../utils/EmbedSchemaParser";

export default class EditMessageCommand extends Command implements HasEventListeners {
    public readonly name = "Edit Message";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly applicationCommandType = ApplicationCommandType.Message;
    public readonly supportsLegacy = false;

    public readonly description = "Edits messages sent by the bot.";

    @GatewayEventListener("interactionCreate")
    async onInteractionCreate(interaction: Interaction<CacheType>) {
        if (!interaction.isModalSubmit() || !interaction.customId.startsWith("editmsg__")) {
            return;
        }

        const echoMentions =
            this.client.configManager.config[interaction.guildId!]?.commands?.echo_mentions ??
            false;

        await interaction
            .deferReply({
                ephemeral: true
            })
            .catch(logError);

        const [, id] = interaction.customId.split("__");

        const message = await interaction.channel?.messages.fetch(id).catch(logError);

        if (!message) {
            await interaction.editReply({
                content: "Failed to edit message, maybe it was removed?"
            });

            return;
        }

        if (message.author.id !== this.client.user!.id) {
            await interaction.editReply({
                content: "You cannot edit this message!"
            });

            return;
        }

        const options = {
            content: interaction.fields.getTextInputValue("content"),
            allowedMentions: (
                interaction.member?.permissions as Readonly<PermissionsBitField>
            )?.has("MentionEveryone", true)
                ? undefined
                : echoMentions
                ? undefined
                : {
                      parse: ["users" as const]
                  }
        };

        const oldMessageOptions = {
            content: message.content,
            embeds: [...message.embeds],
            files: [...message.attachments.toJSON()]
        };

        try {
            await EmbedSchemaParser.editMessage(message, options);
        } catch (error) {
            logError(error);
            await interaction.editReply({
                content: `${this.emoji(
                    "error"
                )} An error has occurred while trying to update the message.`
            });
            return;
        }

        await interaction
            .editReply({
                content: `${this.emoji("check")} Message updated successfully.`
            })
            .catch(logError);

        const embed: APIEmbed = {};

        await this.sendCommandRanLog(message, embed, {
            url: message.url,
            previews: [options],
            async before(channel, sentMessages) {
                const oldMessage = await channel.send(oldMessageOptions).catch(logError);
                embed.description = `The edited message preview is [above](${sentMessages[0]?.url}), and the old message is in the [middle](${oldMessage?.url}).`;
            }
        });
    }

    async execute(interaction: MessageContextMenuCommandInteraction): Promise<CommandReturn> {
        if (interaction.targetMessage.author.id !== this.client.user!.id) {
            await interaction.reply({
                content: `${this.emoji("error")} You cannot edit this message.`,
                ephemeral: true
            });

            return;
        }

        const input = new TextInputBuilder()
            .setCustomId("content")
            .setLabel("Content")
            .setPlaceholder("Type the message content here...")
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph);

        if (interaction.targetMessage.content !== "") {
            input.setValue(interaction.targetMessage.content);
        }

        const modal = new ModalBuilder()
            .setCustomId(`editmsg__${interaction.targetMessage.id}`)
            .setTitle("Edit Message")
            .setComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

        await interaction.showModal(modal).catch(logError);
    }
}
