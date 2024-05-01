import { Buildable, Command } from "@framework/commands/Command";
import Context from "@framework/commands/Context";
import { ContextType } from "@framework/commands/ContextType";
import { Inject } from "@framework/container/Inject";
import type AuditLoggingService from "@main/services/AuditLoggingService";
import { LogEventType } from "@main/types/LoggingSchema";
import {
    ApplicationCommandType,
    PermissionFlagsBits,
    type MessageContextMenuCommandInteraction
} from "discord.js";

class SaveMessageCommand extends Command<ContextType.MessageContextMenu> {
    public override readonly name: string = "Save Message";
    public override readonly description: string = "Saves a message for later review.";
    public override readonly detailedDescription: string =
        "Saves a message for later review, in the log channel.";
    public override readonly permissions = [PermissionFlagsBits.ManageMessages];
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
