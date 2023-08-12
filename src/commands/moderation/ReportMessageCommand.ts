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
    ApplicationCommandType,
    Colors,
    EmbedBuilder,
    GuildMember,
    MessageContextMenuCommandInteraction,
    PermissionsString
} from "discord.js";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { ContextMenuCommandContext } from "../../services/CommandManager";
import { channelInfo, messageInfo, userInfo } from "../../utils/embed";
import { safeChannelFetch } from "../../utils/fetch";
import { logError } from "../../utils/logger";

export default class ReportMessageCommand extends Command {
    public readonly name = "Report Message";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly applicationCommandType = ApplicationCommandType.Message;

    public readonly supportsLegacy = false;
    public readonly description = "Reports the target message to the message log channel and deletes it.";

    permissionCheck(interaction: MessageContextMenuCommandInteraction) {
        const config = this.client.configManager.config[interaction.guildId!]?.message_reporting;

        if (config?.users?.includes(interaction.user.id)) {
            return true;
        }

        const member = interaction.member as GuildMember;

        if (member?.roles.cache.hasAll(...(config?.roles ?? []))) {
            return true;
        }

        if (
            config?.permissionLevel !== undefined &&
            config?.permissionLevel >= 0 &&
            this.client.configManager.config[interaction.guildId!]?.permissions.mode === "levels" &&
            this.client.permissionManager.getMemberPermissionLevel(member) >= config?.permissionLevel
        ) {
            return true;
        }

        if (member?.permissions.has((config?.permissions ?? []) as PermissionsString[], true)) {
            return true;
        }

        return false;
    }

    async execute(interaction: MessageContextMenuCommandInteraction, context: ContextMenuCommandContext): Promise<CommandReturn> {
        const { targetMessage } = interaction;

        await interaction.deferReply({ ephemeral: true });

        if (!this.client.permissionManager.shouldModerate(targetMessage.member!, interaction.member as GuildMember)) {
            await this.error(interaction, "You don't have permission to report messsages from this user!");
            return;
        }

        if (!this.permissionCheck(interaction)) {
            await this.error(interaction, "You don't have permission to run this command");
            return;
        }

        if (!this.client.configManager.config[interaction.guildId!]?.message_reporting?.enabled) {
            await interaction.editReply({
                content: "This server has message reporting turned off. Please turn it on to use this command."
            });

            return;
        }

        const channelId =
            this.client.configManager.config[interaction.guildId!]?.message_reporting?.channel ??
            this.client.configManager.config[interaction.guildId!]?.logging?.primary_channel;

        if (!channelId) {
            await interaction.editReply({
                content: "This server does not have report logging channel set up. Please set it up first."
            });

            return;
        }

        const channel = await safeChannelFetch(interaction.guild!, channelId!);

        if (!channel?.isTextBased()) {
            await interaction.editReply({
                content: "Could not send the reported message to the log channel. This is probably due to a misconfiguration."
            });
            return;
        }

        let url = "";

        try {
            url = (
                await channel.send({
                    embeds: [
                        new EmbedBuilder({
                            color: Colors.Red,
                            title: "Message reported",
                            author: {
                                name: targetMessage.author.username,
                                icon_url: targetMessage.author.displayAvatarURL()
                            },
                            description: targetMessage.content ?? "No content",
                            fields: [
                                {
                                    name: "User",
                                    value: userInfo(targetMessage.author),
                                    inline: true
                                },
                                {
                                    name: "Reported By",
                                    value: userInfo(interaction.user),
                                    inline: true
                                },
                                {
                                    name: "Message",
                                    value: messageInfo(targetMessage)
                                },
                                {
                                    name: "Channel",
                                    value: channelInfo(targetMessage.channel)
                                }
                            ],
                            footer: {
                                text: "Reported"
                            }
                        }).setTimestamp()
                    ],
                    files: targetMessage.attachments.toJSON()
                })
            ).url;
        } catch (e) {
            logError(e);
            await this.error(
                interaction,
                "Could not send the reported message into the log channel! Make sure I have enough permissions."
            );
            return;
        }

        try {
            await targetMessage.delete();
        } catch (e) {
            logError(e);
            await this.error(interaction, "Could not remove the reported message! Make sure I have enough permissions.");
        }

        await this.success(
            interaction,
            `The message was reported and removed. [Click here](${url}) to nagivate to the reported message.`
        );
    }
}
