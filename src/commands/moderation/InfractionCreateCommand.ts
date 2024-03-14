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

import { InfractionType } from "@prisma/client";
import { ChatInputCommandInteraction, GuildMember, PermissionsBitField } from "discord.js";
import { logError } from "../../components/log/Logger";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { stringToTimeInterval } from "../../utils/datetime";

export default class InfractionCreateCommand extends Command {
    public readonly name = "infraction__create";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.ViewAuditLog
    ];
    public readonly supportsLegacy: boolean = false;
    public readonly permissionMode = "or";

    public readonly description = "Create infractions.";
    public readonly detailedDescription = "Create and assign an infraction to someone.";
    public readonly argumentSyntaxes = ["<user> <type> [reason] [duration]"];

    async execute(interaction: ChatInputCommandInteraction): Promise<CommandReturn> {
        const user = interaction.options.getUser("user", true);
        const type = interaction.options.getString("type", true).toUpperCase();
        let reason = interaction.options.getString("reason");
        const duration = interaction.options.getString("duration");
        const parsedDuration = duration ? stringToTimeInterval(duration) : null;

        if (parsedDuration && parsedDuration.error) {
            await interaction.editReply(
                `${this.emoji("error")} ${parsedDuration.error} provided in the \`duration\` field`
            );
            return;
        }

        if (!(type in InfractionType)) {
            await interaction.editReply(
                `${this.emoji("error")} Invalid infraction type provided in the \`type\` field`
            );
            return;
        }

        try {
            const member =
                interaction.guild!.members.cache.get(user.id) ??
                (await interaction.guild!.members.fetch(user.id));

            if (
                !(await this.client.permissionManager.shouldModerate(
                    member,
                    interaction.member! as GuildMember
                ))
            ) {
                await this.error(
                    interaction,
                    "You don't have permission to create infractions for this user!"
                );
                return;
            }
        } catch (e) {
            logError(e);
        }

        if (reason) {
            reason = this.client.infractionManager.processInfractionReason(
                interaction.guildId!,
                reason,
                true
            );
        }

        const infraction = await this.client.prisma.infraction.create({
            data: {
                userId: user.id,
                guildId: interaction.guildId!,
                moderatorId: interaction.user.id,
                type: type as InfractionType,
                reason,
                metadata: parsedDuration?.result
                    ? {
                          duration: parsedDuration.result * 1000
                      }
                    : undefined,
                expiresAt: parsedDuration?.result
                    ? new Date(parsedDuration?.result * 1000 + Date.now())
                    : undefined
            }
        });

        await this.client.loggerService.logInfractionCreate(infraction, user, interaction.user);

        await interaction.editReply({
            embeds: [
                this.client.infractionManager
                    .generateInfractionDetailsEmbed(user, infraction)
                    .setTitle("Infraction Created")
            ]
        });
    }
}
