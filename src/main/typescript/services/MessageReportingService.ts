import { Inject } from "@framework/container/Inject";
import { MemberPermissionData } from "@framework/contracts/PermissionManagerInterface";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { TODO } from "@framework/utils/devflow";
import { userInfo } from "@framework/utils/embeds";
import { fetchChannel, fetchMember } from "@framework/utils/entities";
import { Colors } from "@main/constants/Colors";
import { ModerationActionType } from "@main/schemas/ModerationActionSchema";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type PermissionManagerService from "@main/services/PermissionManagerService";
import {
    ActionRowBuilder,
    GuildMember,
    Message,
    PermissionsString,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    User,
    italic,
    type Interaction
} from "discord.js";

enum ReportStatus {
    Pending = "Pending",
    Resolved = "Resolved",
    Ignored = "Ignored"
}

type ModerationAction = ModerationActionType["type"];

@Name("messageReportingService")
class MessageReportingService extends Service {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("permissionManager")
    private readonly permissionManager!: PermissionManagerService;

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
                    `report_action_${message.author.id}_${message.channelId}_${message.id}`
                )
                .setPlaceholder("Select an action to take")
                .addOptions([
                    {
                        label: "Ignore",
                        value: "ignore",
                        description: "Ignore the report",
                        emoji: "✅"
                    },
                    {
                        label: "Warn",
                        value: "warn" satisfies ModerationAction,
                        description: "Warn the user",
                        emoji: "⚠️"
                    },
                    {
                        label: "Mute",
                        value: "mute" satisfies ModerationAction,
                        description: "Mute the user",
                        emoji: "🔇"
                    },
                    {
                        label: "Kick",
                        value: "kick" satisfies ModerationAction,
                        description: "Kick the user",
                        emoji: "👢"
                    },
                    {
                        label: "Ban",
                        value: "ban" satisfies ModerationAction,
                        description: "Ban the user",
                        emoji: "🔨"
                    },
                    {
                        label: "Other",
                        value: "other",
                        description: "Other action that was taken out of the scope of the system",
                        emoji: "✅"
                    }
                ])
        );

        await channel.send({
            embeds: [embed],
            components: [row]
        });
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isStringSelectMenu() || !interaction.inGuild()) {
            return;
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const [type, action, userId, channelId, messageId] = interaction.customId.split("_");

        if (action !== "action" || type !== "report" || !userId || !channelId || !messageId) {
            await interaction.editReply({ content: "Malformed interaction payload." });
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
            await interaction.editReply({
                content: "You do not have permission to take action on this report."
            });

            return;
        }

        const config = this.config(interaction.guildId);

        if (!config?.enabled) {
            await interaction.editReply({
                content: "Message reporting is not enabled in this server."
            });
            return;
        }

        await this.takeAction(interaction, interaction.values[0]);
        await interaction.editReply({ content: "Successfully took action." });
    }

    private async updateReportStatus(
        interaction: StringSelectMenuInteraction,
        status: ReportStatus,
        resolvedBy: GuildMember | User
    ) {
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
                ]
            })
            .catch(this.logger.error);
    }

    private async takeAction(
        interaction: StringSelectMenuInteraction,
        action: string
    ): Promise<void> {
        switch (action) {
            case "ignore":
                await this.updateReportStatus(interaction, ReportStatus.Ignored, interaction.user);
                break;

            default:
                TODO("Implement moderation actions");
        }
    }
}

export default MessageReportingService;
