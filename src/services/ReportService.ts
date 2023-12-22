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
    GuildMember,
    Message,
    MessageCreateOptions,
    PermissionsString,
    StringSelectMenuBuilder,
    TextBasedChannel,
    User
} from "discord.js";
import Service from "../core/Service";
import LevelBasedPermissionManager from "../utils/LevelBasedPermissionManager";
import { userInfo } from "../utils/embed";
import { safeChannelFetch } from "../utils/fetch";
import { logError } from "../utils/logger";
import { TODO } from "../utils/utils";

export const name = "reportService";

type ReportOptions = {
    reason?: string;
    moderator: GuildMember;
    guildId: string;
    message?: Message;
    member?: GuildMember;
};

export default class ReportService extends Service {
    async report({ reason, moderator, guildId, member, message }: ReportOptions) {
        const config = this.client.configManager.config[guildId!]?.message_reporting;

        if (!config?.enabled) {
            return {
                error: "Message reporting is not enabled in this server."
            };
        }

        const manager = await this.client.permissionManager.getManager(guildId!);

        if (
            (config.permissionLevel !== undefined &&
                config.permissionLevel > 0 &&
                this.client.permissionManager.usesLevelBasedMode(guildId!) &&
                manager instanceof LevelBasedPermissionManager &&
                manager.getPermissionLevel(moderator) < config.permissionLevel) ||
            !manager.getMemberPermissions(moderator).permissions.has(config.permissions as PermissionsString[], true) ||
            !moderator?.roles.cache.hasAll(...(config?.roles ?? []))
        ) {
            return {
                error: "You don't have permission to report messages."
            };
        }

        if (!this.client.permissionManager.shouldModerate(member!, moderator)) {
            return {
                error: "You're missing permissions to moderate this user!"
            };
        }

        const guild = this.client.guilds.cache.get(guildId)!;

        if (config.logging_channel) {
            const channel = await safeChannelFetch(guild, config.logging_channel);

            if (channel?.isTextBased()) {
                await this.sendReportLog(
                    channel,
                    (message?.author ?? member?.user)!,
                    member ? "m" : "u",
                    {
                        title: `${member ? "User" : "Message"} Reported`,
                        description: message?.content,
                        fields: [
                            {
                                name: "Reason",
                                value: reason ?? "*No reason provided*"
                            },
                            {
                                name: "User",
                                value: userInfo((message?.author ?? member?.user)!),
                                inline: true
                            },
                            {
                                name: "Responsible Moderator",
                                value: userInfo(moderator.user),
                                inline: true
                            }
                        ],
                        footer: {
                            text: "Reported"
                        }
                    },
                    {
                        files: message
                            ? message.attachments.map(a => ({
                                  attachment: a.proxyURL,
                                  name: a.name,
                                  description: a.description ?? undefined
                              }))
                            : undefined
                    }
                );
            }
        }

        if (member) {
            TODO();
        } else if (message && message.deletable) {
            message.delete().catch(logError);
        }

        return {
            success: true
        };
    }

    sendReportLog(
        channel: TextBasedChannel,
        offender: User,
        type: "m" | "u",
        embedOptions?: APIEmbed,
        messageOptions?: MessageCreateOptions
    ) {
        return channel.send({
            embeds: [
                {
                    author: {
                        name: offender.username,
                        icon_url: offender.displayAvatarURL()
                    },
                    color: 0x007bff,
                    timestamp: new Date().toISOString(),
                    ...(embedOptions ?? {})
                }
            ],
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`report_${type}_${offender.id}`)
                        .setMinValues(1)
                        .setMaxValues(1)
                        .setPlaceholder("Select an action to take...")
                        .setOptions(
                            {
                                label: "Ignore",
                                description: "Ignore the report and take no action",
                                value: "ignore",
                                emoji: "✅"
                            },
                            {
                                label: "Warn",
                                description: "Warn the user regarding this report",
                                value: "warn",
                                emoji: "🛡️"
                            },
                            {
                                label: "Mute",
                                description: "Mutes the user",
                                value: "mute",
                                emoji: "⌚"
                            },
                            {
                                label: "Kick",
                                description: "Kicks the user from the server",
                                value: "kick",
                                emoji: "🔨"
                            },
                            {
                                label: "Ban",
                                description: "Bans the user from the server",
                                value: "⚙"
                            }
                        )
                )
            ],
            ...(messageOptions ?? {})
        });
    }
}
