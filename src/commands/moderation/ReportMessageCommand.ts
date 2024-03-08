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

import { ApplicationCommandType, GuildMember, MessageContextMenuCommandInteraction, PermissionsString } from "discord.js";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";

export default class ReportMessageCommand extends Command {
    public readonly name = "Report Message";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly applicationCommandType = ApplicationCommandType.Message;

    public readonly supportsLegacy = false;
    public readonly description = "Reports the target message to the message log channel and deletes it.";

    async permissionCheck(interaction: MessageContextMenuCommandInteraction) {
        const config = this.client.configManager.config[interaction.guildId!]?.message_reporting;

        if (config?.users?.includes(interaction.user.id)) {
            return true;
        }

        const member = interaction.member as GuildMember;

        if (member?.roles.cache.hasAll(...(config?.roles ?? []))) {
            return true;
        }

        if (
            config?.permission_level !== undefined &&
            config?.permission_level >= 0 &&
            this.client.permissionManager.usesLevelBasedMode(member.guild.id) &&
            (await this.client.permissionManager.getManager(member.guild.id)).getPermissionLevel(member) >=
                config?.permission_level
        ) {
            return true;
        }

        if (member?.permissions.has((config?.permissions ?? []) as PermissionsString[], true)) {
            return true;
        }

        return false;
    }

    async execute(interaction: MessageContextMenuCommandInteraction): Promise<CommandReturn> {
        const { targetMessage } = interaction;

        await interaction.deferReply({ ephemeral: true });

        if (!(await this.client.permissionManager.shouldModerate(targetMessage.member!, interaction.member as GuildMember))) {
            await this.error(interaction, "You don't have permission to report messages from this user!");
            return;
        }

        if (!this.client.configManager.config[interaction.guildId!]?.message_reporting?.enabled) {
            await interaction.editReply({
                content: "This server has message reporting turned off. Please turn it on to use this command."
            });

            return;
        }

        const { error } = await this.client.reportService.report({
            guildId: interaction.guildId!,
            moderator: interaction.member as GuildMember,
            message: interaction.targetMessage
        });

        if (error) {
            await interaction.editReply({
                content: error
            });

            return;
        }

        await interaction.editReply({
            content: "Successfully reported the message."
        });
    }
}
