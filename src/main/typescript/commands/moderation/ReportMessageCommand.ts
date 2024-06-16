import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import { ContextType } from "@framework/commands/ContextType";
import type InteractionContext from "@framework/commands/InteractionContext";
import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { fetchMessage } from "@framework/utils/entities";
import MessageReportingService from "@main/services/MessageReportingService";
import type {
    GuildMember,
    GuildTextBasedChannel,
    Interaction,
    MessageContextMenuCommandInteraction
} from "discord.js";
import {
    ActionRowBuilder,
    ApplicationCommandType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";

class ReportMessageCommand extends Command<ContextType.MessageContextMenu> {
    public override readonly name = "Report Message";
    public override readonly description: string = "Reports a message.";
    public override readonly usage = [""];
    public override readonly systemPermissions = [];
    public override readonly supportedContexts = [ContextType.MessageContextMenu] as const;

    @Inject()
    private readonly messageReportingService!: MessageReportingService;

    public override build(): Buildable[] {
        return [this.buildContextMenu().setType(ApplicationCommandType.Message)];
    }

    public override async execute(
        context: InteractionContext<MessageContextMenuCommandInteraction>
    ): Promise<void> {
        const reporter = context.member;

        if (!reporter) {
            await context.error("Unable to compute permissions");
            return;
        }

        if (!(await this.messageReportingService.canReport(reporter))) {
            await context.error({
                content: "You do not have permission to report messages.",
                ephemeral: true
            });

            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`report_message_${context.commandMessage.targetId}`)
            .setTitle("Report Message")
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("reason")
                        .setLabel("Reason")
                        .setPlaceholder("Reason")
                        .setRequired(false)
                        .setStyle(TextInputStyle.Paragraph)
                )
            );

        await context.commandMessage.showModal(modal);
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isModalSubmit() || !interaction.customId.startsWith("report_message_")) {
            return;
        }

        const reporter = interaction.member;

        if (!reporter) {
            await interaction.reply({
                content: "Unable to compute permissions",
                ephemeral: true
            });

            return;
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const [, , messageId] = interaction.customId.split("_");
        const message = await fetchMessage(interaction.channel as GuildTextBasedChannel, messageId);

        if (!message?.inGuild()) {
            await interaction.editReply({
                content: "Unable to retrieve message"
            });

            return;
        }

        const reason = interaction.fields.fields.some(f => f.customId === "reason")
            ? interaction.fields.getTextInputValue("reason") || undefined
            : undefined;
        const result = await this.messageReportingService.report(
            message,
            reporter as GuildMember,
            reason
        );

        if (result === false) {
            await interaction.editReply({
                content: "You do not have permission to report messages."
            });

            return;
        }

        if (result === null) {
            await interaction.editReply({
                content: "Unable to report message"
            });

            return;
        }

        await interaction.editReply({
            content: "Message reported successfully."
        });
    }
}

export default ReportMessageCommand;
