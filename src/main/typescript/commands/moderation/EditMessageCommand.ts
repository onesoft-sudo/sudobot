/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { type Buildable, Command } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import { ApplicationCommandType } from "@framework/discord/ApplicationCommandType";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import DirectiveParsingService from "@main/services/DirectiveParsingService";
import type SystemAuditLoggingService from "@main/services/SystemAuditLoggingService";
import {
    ActionRowBuilder,
    type APIEmbed,
    type CacheType,
    type Interaction,
    MessageContextMenuCommandInteraction,
    ModalBuilder,
    PermissionsBitField,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";

export default class EditMessageCommand extends Command implements HasEventListeners {
    public override readonly name = "Edit Message";
    public override readonly description: string = "Edits messages sent by the bot.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly systemAdminOnly = true;

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("systemAuditLogging")
    protected readonly systemAuditLogging!: SystemAuditLoggingService;

    @Inject()
    protected readonly directiveParsingService!: DirectiveParsingService;

    public override build(): Buildable[] {
        return [this.buildContextMenu().setType(ApplicationCommandType.Message)];
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction<CacheType>) {
        if (!interaction.isModalSubmit() || !interaction.customId.startsWith("editmsg__")) {
            return;
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const [, id] = interaction.customId.split("__");
        const message = await interaction.channel?.messages.fetch(id);

        if (!message) {
            await interaction.editReply({
                content: "Failed to edit message, maybe it was removed?"
            });

            return;
        }

        if (message.author.id !== this.application.client.user!.id) {
            await interaction.editReply({
                content: "You cannot edit this message!"
            });

            return;
        }

        const content = interaction.fields.getTextInputValue("content");

        try {
            const { data, output } = await this.directiveParsingService.parse(content);
            const options = {
                content: output.trim() === "" ? undefined : output,
                embeds: (data.embeds as APIEmbed[]) ?? [],
                allowedMentions:
                    this.configManager.config[interaction.guildId!]?.echoing?.allow_mentions !==
                        false ||
                    (interaction.member?.permissions as Readonly<PermissionsBitField>)?.has(
                        "MentionEveryone",
                        true
                    )
                        ? { parse: [], roles: [], users: [] }
                        : undefined
            };

            try {
                await message.edit(options);
            } catch (error) {
                await interaction.editReply({
                    content: "An error has occurred while trying to update the message."
                });

                return;
            }

            this.systemAuditLogging
                .logEchoCommandExecuted({
                    command: this.name,
                    guild: interaction.guild!,
                    rawCommandContent: content,
                    user: interaction.user,
                    generatedMessageOptions: options
                })
                .catch(this.application.logger.error);
        } catch (error) {
            return void interaction.editReply(
                error instanceof DirectiveParseError
                    ? error.message.replace("Invalid argument: ", "")
                    : "Error parsing the directives in the message content."
            );
        }

        await interaction
            .editReply({
                content: "Message updated successfully."
            })
            .catch(this.application.logger.error);
    }

    public override async execute(
        context: Context<MessageContextMenuCommandInteraction>
    ): Promise<void> {
        const { commandMessage: interaction } = context;

        if (interaction.targetMessage.author.id !== this.application.client.user!.id) {
            await interaction.reply({
                content: `${context.emoji("error")} You cannot edit this message.`,
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

        await interaction.showModal(modal).catch(this.application.logger.error);
    }
}
