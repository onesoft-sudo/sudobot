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
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { ApplicationCommandType, type MessageContextMenuCommandInteraction } from "discord.js";

class SaveMessageCommand extends Command<ContextType.MessageContextMenu> {
    public override readonly name: string = "Save Message";
    public override readonly description: string = "Saves a message for later review.";
    public override readonly detailedDescription: string =
        "Saves a message for later review, in the log channel.";
    public override readonly permissions = [PermissionFlags.ManageMessages];
    public override readonly supportedContexts: ContextType.MessageContextMenu[] = [
        ContextType.MessageContextMenu
    ];

    @Inject("auditLoggingService")
    protected readonly auditLoggingService!: AuditLoggingService;

    public override build(): Buildable[] {
        return [this.buildContextMenu().setType(ApplicationCommandType.Message)];
    }

    public override async execute(
        context: Context<MessageContextMenuCommandInteraction>
    ): Promise<void> {
        const { commandMessage: interaction } = context;

        await interaction.deferReply({
            ephemeral: true
        });

        if (!interaction.targetMessage) {
            await context.error("You must select a message to save.");
            return;
        }

        const message = await this.auditLoggingService.emitLogEvent(
            interaction.guildId!,
            LogEventType.SystemUserMessageSave,
            interaction.targetMessage,
            interaction.user
        );

        if (!message) {
            await interaction.editReply(
                "Failed to save message. Maybe you do not have logging enabled?"
            );
            return;
        }

        await interaction.editReply(
            "Message saved successfully." +
                (message ? ` [Click here](${message.url}) to see the saved message.` : "")
        );
    }
}

export default SaveMessageCommand;
