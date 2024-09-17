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

import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { userInfo } from "@framework/utils/embeds";
import { GuildConfig } from "@main/schemas/GuildConfigSchema";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { safeChannelFetch } from "@main/utils/fetch";
import { chunkedString } from "@main/utils/utils";
import {
    ActionRowBuilder,
    ButtonInteraction,
    CacheType,
    ChatInputCommandInteraction,
    GuildMember,
    HeadingLevel,
    type Interaction,
    ModalBuilder,
    ModalSubmitInteraction,
    PermissionsString,
    TextInputBuilder,
    TextInputStyle,
    heading
} from "discord.js";

@Name("surveyService")
class SurveyService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        const config = this.configManager.config[interaction.guildId!]?.survey_system;

        if (!config?.enabled) {
            return;
        }

        if (interaction.isButton() && interaction.customId.startsWith("survey_")) {
            await this.onSurveyShowRequest(interaction);
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("survey_")) {
            await this.onModalSubmit(interaction);
            return;
        }
    }

    public async onSurveyShowRequest(interaction: ButtonInteraction | ChatInputCommandInteraction) {
        const config = this.configManager.config[interaction.guildId!]?.survey_system;

        if (!config?.enabled) {
            await interaction.reply({
                content: "Sorry, surveys are not enabled on this server.",
                ephemeral: true
            });

            return;
        }

        const customId = interaction.isButton()
            ? interaction.customId.replace(/^survey_/, "")
            : interaction.options.getString("survey", true);
        const surveyConfig = config.surveys[customId as unknown as keyof typeof config.surveys];

        if (!surveyConfig) {
            await interaction.reply({
                content: "That survey does not exist!",
                ephemeral: true
            });

            return;
        }

        if (!this.checkPreconditions(interaction, surveyConfig)) {
            await interaction.reply({
                content: "Sorry, you do not meet the requirements to fill out this survey.",
                ephemeral: true
            });

            return;
        }

        const modal = this.buildModal(customId.toLowerCase(), surveyConfig);
        await interaction.showModal(modal);
    }

    public async onModalSubmit(interaction: ModalSubmitInteraction<CacheType>) {
        const config = this.configManager.config[interaction.guildId!]?.survey_system;

        if (!config?.enabled) {
            await interaction.reply({
                content: "Sorry, surveys are not enabled on this server.",
                ephemeral: true
            });

            return;
        }

        const customId = interaction.customId.replace(/^survey_/, "");
        const surveyConfig = config.surveys[customId as unknown as keyof typeof config.surveys];

        if (!surveyConfig) {
            await interaction.reply({
                content: "That survey does not exist!",
                ephemeral: true
            });

            return;
        }

        if (!this.checkPreconditions(interaction, surveyConfig)) {
            await interaction.reply({
                content: "Sorry, you do not meet the requirements to fill out this survey.",
                ephemeral: true
            });

            return;
        }

        let i = 0;
        let summary = `${heading(
            `Survey completed by <@${interaction.user.id}> (${interaction.user.id})`,
            HeadingLevel.One
        )}\n${userInfo(interaction.user)}\n\n`;

        for (const question of surveyConfig.questions) {
            const answer = interaction.fields.getTextInputValue(
                `survey_${customId}_question_${i++}`
            );

            if (question.required && !answer) {
                await interaction.reply({
                    content: "You must fill out all required questions!",
                    ephemeral: true
                });

                return;
            }

            summary += `${heading(question.question, HeadingLevel.Three)}\n${answer}\n`;
        }

        await interaction.reply({
            content: surveyConfig.end_message ?? "Thank you for filling out the form!",
            ephemeral: true
        });

        const logChannelId = surveyConfig.log_channel ?? config.default_log_channel;

        if (!logChannelId) {
            this.logger.warn("No log channel specified for survey completion.");
            return;
        }

        const logChannel = await safeChannelFetch(interaction.guild!, logChannelId);

        if (!logChannel?.isTextBased()) {
            this.logger.warn(
                "Log channel specified for survey completion does not exist or is not text-based."
            );

            return;
        }

        chunkedString(summary, 2000).forEach(chunk =>
            logChannel.send({
                content: chunk,
                allowedMentions: { parse: [], roles: [], users: [] }
            })
        );
    }

    private checkPreconditions(
        interaction: Interaction,
        surveyConfig: NonNullable<GuildConfig["survey_system"]>["surveys"][string]
    ) {
        return (
            surveyConfig &&
            (!surveyConfig.required_channels?.length ||
                surveyConfig.required_channels.includes(interaction.channelId!)) &&
            (!surveyConfig.required_roles?.length ||
                (interaction.member instanceof GuildMember &&
                    surveyConfig.required_roles.some(role =>
                        (interaction.member as GuildMember)?.roles.cache.has(role)
                    ))) &&
            (!surveyConfig.required_permissions?.length ||
                (interaction.member as GuildMember).permissions.has(
                    surveyConfig.required_permissions as PermissionsString[],
                    true
                )) &&
            (!surveyConfig.required_users?.length ||
                surveyConfig.required_users.includes(interaction.user.id))
        );
    }

    public buildModal(
        customId: string,
        surveyConfig: NonNullable<GuildConfig["survey_system"]>["surveys"][string]
    ) {
        const components: ActionRowBuilder<TextInputBuilder>[] = [];
        let i = 0;

        for (const question of surveyConfig.questions) {
            const input = new TextInputBuilder()
                .setCustomId(`survey_${customId}_question_${i}`)
                .setLabel(question.question);

            if (question.maxLength) {
                input.setMaxLength(question.maxLength);
            }

            if (question.minLength) {
                input.setMinLength(question.minLength);
            }

            if (question.placeholder) {
                input.setPlaceholder(question.placeholder);
            }

            if (question.default_value) {
                input.setValue(question.default_value);
            }

            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
                input
                    .setRequired(question.required)
                    .setStyle(
                        question.type === "paragraph"
                            ? TextInputStyle.Paragraph
                            : TextInputStyle.Short
                    )
            );

            components.push(row);
            i++;
        }

        return new ModalBuilder()
            .setCustomId(`survey_${customId}`)
            .setTitle(surveyConfig.name)
            .setComponents(components);
    }
}

export default SurveyService;
