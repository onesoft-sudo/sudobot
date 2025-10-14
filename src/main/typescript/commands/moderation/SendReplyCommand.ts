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

import { Buildable, Command } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { ContextType } from "@framework/commands/ContextType";
import { Inject } from "@framework/container/Inject";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import { ApplicationCommandType } from "@framework/discord/ApplicationCommandType";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import DirectiveParsingService from "@main/services/DirectiveParsingService";
import type PermissionManagerService from "@main/services/PermissionManagerService";
import type SystemAuditLoggingService from "@main/services/SystemAuditLoggingService";
import { isTextBasedChannel } from "@main/utils/utils";
import {
    ActionRowBuilder,
    type APIEmbed,
    GuildMember,
    type Interaction,
    type MessageContextMenuCommandInteraction,
    type MessageCreateOptions,
    type MessagePayload,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";

class SendReplyCommand
    extends Command<ContextType.MessageContextMenu>
    implements HasEventListeners
{
    public override readonly name: string = "Send Reply";
    public override readonly description: string = "Send a reply to the selected message";
    public override readonly detailedDescription: string =
        "Send a reply to the selected message, using an interactive modal.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly supportedContexts: ContextType.MessageContextMenu[] = [
        ContextType.MessageContextMenu
    ];

    @Inject("configManager")
    protected readonly configManager!: ConfigurationManager;

    @Inject("systemAuditLogging")
    protected readonly systemAuditLogging!: SystemAuditLoggingService;

    @Inject("permissionManager")
    protected readonly permissionManager!: PermissionManagerService;

    @Inject()
    protected readonly directiveParsingService!: DirectiveParsingService;

    public override build(): Buildable[] {
        return [this.buildContextMenu().setType(ApplicationCommandType.Message)];
    }

    public override async execute(
        context: Context<MessageContextMenuCommandInteraction>
    ): Promise<void> {
        const { commandMessage: interaction } = context;

        if (!interaction.targetMessage) {
            await context.error("You must select a message to reply to.");
            return;
        }

        const modal = new ModalBuilder()
            .setTitle("Send Reply")
            .setCustomId(`send_reply_${interaction.targetMessage.id}`)
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("content")
                        .setLabel("Content")
                        .setPlaceholder("Enter the message content")
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(4000)
                        .setStyle(TextInputStyle.Paragraph)
                )
            );

        await interaction.showModal(modal);
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (
            !interaction.isModalSubmit() ||
            !interaction.customId.startsWith("send_reply_") ||
            !interaction.channel ||
            !interaction.member ||
            !await this.permissionManager.hasPermissions(interaction.member as GuildMember, this.permissions)
        ) {
            return;
        }

        const messageId = interaction.customId.split("_")[2];

        if (!messageId) {
            return;
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const content = interaction.fields.getTextInputValue("content");

        try {
            const { data, output } = await this.directiveParsingService.parse(content);
            const options = {
                content: output.trim() === "" ? undefined : output,
                embeds: (data.embeds as APIEmbed[]) ?? [],
                allowedMentions:
                    this.configManager.config[interaction.guildId!]?.echoing?.allow_mentions !==
                        false || interaction.memberPermissions?.has("MentionEveryone", true)
                        ? undefined
                        : { parse: [], roles: [], users: [] }
            } satisfies MessageCreateOptions | MessagePayload;

            if (isTextBasedChannel(interaction.channel)) {
                try {
                    await interaction.channel?.send({
                        ...options,
                        reply: {
                            messageReference: messageId,
                            failIfNotExists: true
                        }
                    });
                    await interaction.editReply("The reply has been sent.");
                } catch {
                    await interaction.editReply("An error has occurred while sending the reply.");
                }
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
    }
}

export default SendReplyCommand;
