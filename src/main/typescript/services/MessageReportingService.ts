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
import { MemberPermissionData } from "@framework/contracts/PermissionManagerInterface";
import Duration from "@framework/datetime/Duration";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { userInfo } from "@framework/utils/embeds";
import { fetchChannel, fetchMember, fetchUser } from "@framework/utils/entities";
import { Colors } from "@main/constants/Colors";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type InfractionManager from "@main/services/InfractionManager";
import type PermissionManagerService from "@main/services/PermissionManagerService";
import {
    APIEmbed,
    ActionRowBuilder,
    EmbedBuilder,
    GuildMember,
    Message,
    ModalBuilder,
    ModalSubmitInteraction,
    PermissionsString,
    Snowflake,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle,
    User,
    italic,
    type Interaction
} from "discord.js";

enum ReportStatus {
    Pending = "Pending",
    Resolved = "Resolved",
    Ignored = "Ignored",
    Warned = "Warned",
    Muted = "Muted",
    Kicked = "Kicked",
    Banned = "Banned"
}

type ModerationAction = "ban" | "warn" | "kick" | "mute";

@Name("messageReportingService")
class MessageReportingService extends Service {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("permissionManager")
    private readonly permissionManager!: PermissionManagerService;

    @Inject("infractionManager")
    private readonly infractionManager!: InfractionManager;

    private static readonly ACTION_OPTIONS = [
        {
            label: "Ignore",
            value: "ignore",
            description: "Ignore the report",
            emoji: "✅",
            default: false
        },
        {
            label: "Warn",
            value: "warn" satisfies ModerationAction,
            description: "Warn the user",
            emoji: "⚠️",
            default: false
        },
        {
            label: "Mute",
            value: "mute" satisfies ModerationAction,
            description: "Mute the user",
            emoji: "🔇",
            default: false
        },
        {
            label: "Kick",
            value: "kick" satisfies ModerationAction,
            description: "Kick the user",
            emoji: "👢",
            default: false
        },
        {
            label: "Ban",
            value: "ban" satisfies ModerationAction,
            description: "Ban the user",
            emoji: "🔨",
            default: false
        },
        {
            label: "Other",
            value: "other",
            description: "Other action that was taken out of the scope of the system",
            emoji: "✅",
            default: false
        }
    ];

    private config(guildId: string) {
        return this.configManager.config[guildId]?.message_reporting;
    }

    public async canReport(reporter: GuildMember): Promise<boolean> {
        const config = this.config(reporter.guild.id);

        if (!config?.enabled) {
            return false;
        }

        if (config.users.length && !config.users.includes(reporter.id)) {
            return false;
        }

        if (
            config.roles.length &&
            !reporter.roles.cache.some(role => config.roles.includes(role.id))
        ) {
            return false;
        }

        if (config.permissions?.length || config.permission_level !== undefined) {
            const { grantedDiscordPermissions, grantedSystemPermissions, level } =
                (await this.permissionManager.getMemberPermissions(
                    reporter
                )) as MemberPermissionData & {
                    level?: number;
                };

            if (
                config.permissions?.length &&
                !grantedSystemPermissions.has("system.admin") &&
                !grantedDiscordPermissions.hasAll(...(config.permissions as PermissionsString[]))
            ) {
                return false;
            }

            if (
                config.permission_level !== undefined &&
                level !== undefined &&
                level < config.permission_level
            ) {
                return false;
            }
        }

        return true;
    }

    public async report(message: Message<true>, reporter: GuildMember, reason?: string) {
        const config = this.config(message.guildId);

        if (!config?.enabled) {
            return null;
        }

        if (!config.logging_channel) {
            return null;
        }

        if (!message.deletable) {
            return null;
        }

        if (!(await this.canReport(reporter))) {
            return false;
        }

        await message.delete().catch(this.logger.error);

        const channel = await fetchChannel(message.guild, config.logging_channel!);

        if (!channel?.isTextBased()) {
            return null;
        }

        const embed = {
            color: Colors.Red,
            author: {
                name: "Message Reported",
                icon_url: message.author.displayAvatarURL()
            },
            description: message.content,
            timestamp: message.createdAt.toISOString(),
            fields: [
                {
                    name: "Author",
                    value: userInfo(message.author),
                    inline: true
                },
                {
                    name: "Reported by",
                    value: userInfo(reporter.user),
                    inline: true
                },
                {
                    name: "Reason",
                    value: reason ?? italic("No reason provided")
                },
                {
                    name: "Channel",
                    value: `<#${message.channelId}>`,
                    inline: true
                },
                {
                    name: "Message",
                    value: `[Jump to context](${message.url})`,
                    inline: true
                },
                {
                    name: "Status",
                    value: ReportStatus.Pending
                }
            ],
            footer: {
                text: "Reported"
            }
        };

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(
                    `msgreport_report_action_${message.author.id}_${message.channelId}_${message.id}`
                )
                .setPlaceholder("Select an action to take")
                .addOptions(MessageReportingService.ACTION_OPTIONS)
        );

        await channel.send({
            embeds: [embed],
            components: [row]
        });
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (!interaction.inGuild()) {
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("msgreport_")) {
            const [type, action, userId, channelId, messageId] = interaction.customId
                .slice("msgreport_".length)
                .split("_");

            if (action !== "action" || type !== "report" || !userId || !channelId || !messageId) {
                await interaction.reply({
                    content: "Malformed interaction payload.",
                    ephemeral: true
                });
                return;
            }

            if (!interaction.member) {
                return;
            }

            const member = await fetchMember(interaction.guild!, userId);

            if (
                member &&
                !(await this.application
                    .service("permissionManager")
                    .canModerate(member, interaction.member as GuildMember))
            ) {
                await interaction.reply({
                    content: "You do not have permission to take action on this report.",
                    ephemeral: true
                });

                return;
            }

            const config = this.config(interaction.guildId);

            if (!config?.enabled) {
                await interaction.reply({
                    content: "Message reporting is not enabled in this server.",
                    ephemeral: true
                });
                return;
            }

            await this.takeBasicAction(interaction, interaction.values[0], userId);
        } else if (interaction.isModalSubmit() && interaction.customId.startsWith("rpl_")) {
            const [type, action, userId] = interaction.customId.split("_") as [
                string,
                ModerationAction,
                string
            ];

            if (type !== "rpl" || !action || !userId) {
                return;
            }

            await interaction.deferReply({
                ephemeral: true
            });

            const member = await fetchMember(interaction.guild!, userId);

            if (!member && action !== "ban") {
                await interaction.editReply({ content: "Invalid user received." });
                return;
            }

            const user = member?.user ?? (await fetchUser(this.application.client, userId));

            if (!user) {
                await interaction.editReply({ content: "Invalid user received." });
                return;
            }

            const duration = interaction.fields.fields.some(field => field.customId === "duration")
                ? interaction.fields.getTextInputValue("duration")
                : undefined;
            const reason = interaction.fields.fields.some(field => field.customId === "reason")
                ? interaction.fields.getTextInputValue("reason")
                : undefined;
            let parsedDuration: Duration | undefined = undefined;

            try {
                parsedDuration = duration
                    ? Duration.fromDurationStringExpression(duration)
                    : undefined;
            } catch (error) {
                await interaction.editReply({ content: "Invalid duration provided." });
                return;
            }

            let overviewEmbed: EmbedBuilder | APIEmbed | null = null;

            switch (action) {
                case "warn":
                    overviewEmbed = (
                        await this.infractionManager.createWarning({
                            member: member!,
                            guildId: interaction.guildId,
                            reason,
                            moderator: interaction.user,
                            notify: true,
                            generateOverviewEmbed: true
                        })
                    ).overviewEmbed;

                    if (overviewEmbed) {
                        await this.updateReportStatus(
                            interaction,
                            ReportStatus.Warned,
                            action,
                            interaction.user
                        );
                    }

                    break;
                case "ban":
                    overviewEmbed = (
                        await this.infractionManager.createBan({
                            user,
                            guildId: interaction.guildId,
                            reason,
                            moderator: interaction.user,
                            notify: true,
                            generateOverviewEmbed: true,
                            duration: parsedDuration
                        })
                    ).overviewEmbed;

                    if (overviewEmbed) {
                        await this.updateReportStatus(
                            interaction,
                            ReportStatus.Banned,
                            action,
                            interaction.user
                        );
                    }

                    break;
                case "mute":
                    overviewEmbed = (
                        await this.infractionManager.createMute({
                            member: member!,
                            guildId: interaction.guildId,
                            reason,
                            moderator: interaction.user,
                            notify: true,
                            generateOverviewEmbed: true,
                            duration: parsedDuration
                        })
                    ).overviewEmbed;

                    if (overviewEmbed) {
                        await this.updateReportStatus(
                            interaction,
                            ReportStatus.Muted,
                            action,
                            interaction.user
                        );
                    }

                    break;
                case "kick":
                    overviewEmbed = (
                        await this.infractionManager.createKick({
                            member: member!,
                            guildId: interaction.guildId,
                            reason,
                            moderator: interaction.user,
                            notify: true,
                            generateOverviewEmbed: true
                        })
                    ).overviewEmbed;

                    if (overviewEmbed) {
                        await this.updateReportStatus(
                            interaction,
                            ReportStatus.Kicked,
                            action,
                            interaction.user
                        );
                    }

                    break;
            }

            if (overviewEmbed) {
                await interaction.editReply({
                    embeds: [overviewEmbed]
                });
            } else {
                await interaction.editReply({ content: "Failed to take action." });
            }
        }
    }

    private async updateReportStatus(
        interaction: StringSelectMenuInteraction | ModalSubmitInteraction,
        status: ReportStatus,
        action: string,
        resolvedBy: GuildMember | User
    ) {
        if (!interaction.message) {
            throw new Error("Interaction message is not available.");
        }

        const embed = interaction.message.embeds[0];

        if (!embed) {
            return;
        }

        await interaction.message
            .edit({
                embeds: [
                    {
                        ...embed.data,
                        fields: embed.fields.map(field => {
                            if (field.name === "Status") {
                                field.value = `**${status}** by <@${resolvedBy.id}>`;
                            }

                            return field;
                        })
                    }
                ],
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("report_action")
                            .setMaxValues(1)
                            .setMinValues(1)
                            .setOptions(
                                MessageReportingService.ACTION_OPTIONS.filter(option => {
                                    if (option.value === action) {
                                        option.default = true;
                                        return true;
                                    }

                                    return false;
                                })
                            )
                    )
                ]
            })
            .catch(this.logger.error);
    }

    private createTakeActionModal(userId: Snowflake, action: string) {
        const rows = [] as ActionRowBuilder<TextInputBuilder>[];

        if (action === "mute" || action === "ban") {
            rows.push(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId("duration")
                        .setLabel("Duration")
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short)
                )
            );
        }

        rows.push(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId("reason")
                    .setLabel("Reason")
                    .setRequired(false)
                    .setStyle(TextInputStyle.Paragraph)
            )
        );

        const modal = new ModalBuilder()
            .setCustomId(`rpl_${action}_${userId}`)
            .setTitle("Take Action")
            .addComponents(...rows);

        return modal;
    }

    private async takeBasicAction(
        interaction: StringSelectMenuInteraction,
        action: string,
        targetId: Snowflake
    ): Promise<void> {
        switch (action as ModerationAction | "ignore" | "other") {
            case "ignore":
                await this.updateReportStatus(
                    interaction,
                    ReportStatus.Ignored,
                    action,
                    interaction.user
                );

                await interaction.reply({
                    content: "Successfully ignored the report.",
                    ephemeral: true
                });

                break;

            case "other":
                await this.updateReportStatus(
                    interaction,
                    ReportStatus.Resolved,
                    action,
                    interaction.user
                );

                await interaction.reply({
                    content: "Successfully resolved the report.",
                    ephemeral: true
                });

                break;

            default: {
                const modal = this.createTakeActionModal(targetId, action);
                await interaction.showModal(modal);
            }
        }
    }
}

export default MessageReportingService;
