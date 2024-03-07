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

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, ComponentType, PermissionsBitField } from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn } from "../../core/Command";

export default class AFKClearCommand extends Command {
    public readonly name = "afks__clear";
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers];
    public readonly description = "Removes AFK status for everyone in this server.";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const entryCount = this.client.afkService.getGuildAFKs(message.guildId!).size;

        if (entryCount === 0) {
            await message.reply("No user is AFK at the moment in this server.");
            return;
        }

        const reply = await message.reply({
            embeds: [
                {
                    author: {
                        name: "Clear AFK statuses",
                        icon_url: message.guild?.iconURL() ?? undefined
                    },
                    description: `Are you sure you want to perform this action? This will affect **${entryCount}** user(s).`,
                    color: 0x007bff
                }
            ],
            components: [this.buildActionRow()]
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            dispose: true,
            time: 60_600,
            filter: interaction => interaction.customId.startsWith("afkclear_") && interaction.user.id === message.member?.user.id
        });

        collector.on("collect", async interaction => {
            await interaction.deferUpdate();

            if (interaction.customId === "afkclear_cancel") {
                collector.stop("cancelled");
                return;
            }

            const { count } = await this.client.afkService.removeGuildAFKs(message.guildId!);

            await reply.edit({
                embeds: [
                    {
                        author: {
                            name: "Clear AFK statuses",
                            icon_url: message.guild?.iconURL() ?? undefined
                        },
                        description: `${this.emoji(
                            "check"
                        )} Operation completed successfully. **${count}** user(s) are affected.`,
                        color: Colors.Green
                    }
                ],
                components: [this.buildActionRow(true)]
            });

            collector.stop("completed");
        });

        collector.on("end", async () => {
            if (collector.endReason === "completed") {
                return;
            }

            await reply.edit({
                embeds: [
                    {
                        author: {
                            name: "Clear AFK statuses",
                            icon_url: message.guild?.iconURL() ?? undefined
                        },
                        description: `Operation Cancelled${collector.endReason === "cancelled" ? "" : " due to inactivity"}.`,
                        color: Colors.Red
                    }
                ],
                components: [this.buildActionRow(true)]
            });
        });
    }

    buildActionRow(disabled = false) {
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setDisabled(disabled)
                .setCustomId("afkclear_cancel")
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setDisabled(disabled)
                .setCustomId("afkclear_continue")
                .setLabel("Continue")
                .setStyle(ButtonStyle.Success)
        );
    }
}
