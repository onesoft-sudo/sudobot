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

import { formatDistanceToNowStrict } from "date-fns";
import { ChatInputCommandInteraction, EmbedBuilder, PermissionsBitField } from "discord.js";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { ChatInputCommandContext } from "../../services/CommandManager";
import { stringToTimeInterval } from "../../utils/utils";

export default class InfractionEditCommand extends Command {
    public readonly name = "infraction__edit";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly supportsLegacy: boolean = false;

    public readonly description = "Edit infractions.";
    public readonly detailedDescription = "Update an infraction with a new reason or duration or both.";
    public readonly argumentSyntaxes = ["<infraction_id> [new_reason] [new_duration]"];

    async execute(interaction: ChatInputCommandInteraction, context: ChatInputCommandContext): Promise<CommandReturn> {
        const id = interaction.options.getInteger("id", true);
        const newReason = interaction.options.getString("new_reason");
        const newDuration = interaction.options.getString("new_duration");

        if (!newReason && !newDuration) {
            await interaction.editReply(
                `${this.emoji("error")} Either provide a reason or duration or both to update this infraction, if it exists!`
            );
            return;
        }

        const newDurationSeconds = newDuration ? stringToTimeInterval(newDuration) : undefined;
        const silent = interaction.options.getBoolean("silent") ?? true;

        if (newDurationSeconds && newDurationSeconds.error) {
            await interaction.editReply(`${this.emoji("error")} ${newDurationSeconds.error} provided in the \`new_duration\` field`);
            return;
        }

        const infraction = await this.client.prisma.infraction.findFirst({
            where: { id, guildId: interaction.guildId! }
        });

        if (!infraction) {
            await interaction.editReply(`${this.emoji("error")} Could not find an infraction with that ID!`);
            return;
        }

        if (newDurationSeconds?.result && infraction.expiresAt && infraction.expiresAt.getTime() <= Date.now()) {
            await interaction.editReply(`${this.emoji("error")} That infraction is expired, so you can't change it's duration!`);
            return;
        }

        if (newDurationSeconds?.result && infraction.createdAt.getTime() + newDurationSeconds?.result * 1000 <= Date.now()) {
            await interaction.editReply(
                `${this.emoji(
                    "error"
                )} That duration makes the infraction expire in the past, which is not possible! Please make sure the time of infraction creation plus the new duration is greater than the current time!`
            );
            return;
        }

        if (newDurationSeconds?.result && infraction.expiresAt === null) {
            await interaction.editReply(
                `${this.emoji("error")} This infraction did not have a duration in the first place, so you can't set one now.`
            );

            return;
        }

        const user = await this.client.fetchUserSafe(infraction.userId);

        if (newDurationSeconds && infraction.queueId) {
            const queue = this.client.queueManager.queues.get(`${infraction.queueId}`);

            if (queue) {
                await queue.updateTime(new Date(infraction.createdAt.getTime() + newDurationSeconds.result * 1000));
            }
        }

        if (!silent) {
            await user?.send({
                embeds: [
                    new EmbedBuilder({
                        author: {
                            icon_url: interaction.guild?.iconURL() ?? undefined,
                            name: "Your infraction has been updated in " + interaction.guild!.name
                        },
                        color: 0xf14a60,
                        fields: [
                            ...(newReason
                                ? [
                                      {
                                          name: "Reason",
                                          value: newReason
                                      }
                                  ]
                                : []),
                            ...(newDurationSeconds?.result
                                ? [
                                      {
                                          name: "Duration",
                                          value: formatDistanceToNowStrict(
                                              new Date(infraction.createdAt.getTime() + newDurationSeconds.result * 1000)
                                          )
                                      }
                                  ]
                                : []),
                            {
                                name: "Infraction ID",
                                value: id.toString()
                            }
                        ]
                    }).setTimestamp()
                ]
            });
        }

        await this.client.prisma.infraction.update({
            data: {
                reason: newReason ?? undefined,
                expiresAt: newDurationSeconds ? new Date(infraction.createdAt.getTime() + newDurationSeconds.result * 1000) : undefined
            },
            where: { id }
        });

        await interaction.editReply({
            embeds: [
                new EmbedBuilder({
                    title: "Infraction update",
                    description: "Updated successfully!",
                    color: 0x007bff,
                    fields: [
                        ...(newReason
                            ? [
                                  {
                                      name: "New Reason",
                                      value: newReason
                                  }
                              ]
                            : []),
                        ...(newDurationSeconds?.result
                            ? [
                                  {
                                      name: "New Duration",
                                      value: formatDistanceToNowStrict(new Date(infraction.createdAt.getTime() + newDurationSeconds.result * 1000))
                                  }
                              ]
                            : []),
                        {
                            name: "ID",
                            value: id.toString()
                        },
                        {
                            name: "Notifying User?",
                            value: silent ? "No" : "Yes",
                            inline: true
                        }
                    ],
                    footer: {
                        text: "Updated"
                    }
                }).setTimestamp()
            ]
        });
    }
}
