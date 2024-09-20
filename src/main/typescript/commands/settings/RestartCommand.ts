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

import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import StartupManager from "@main/services/StartupManager";
import { emoji } from "@main/utils/emoji";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type Interaction,
    Snowflake
} from "discord.js";

class RestartCommand extends Command {
    public override readonly name = "restart";
    public override readonly description: string = "Restarts the bot system.";
    public override readonly usage = [""];
    public override readonly systemAdminOnly = true;
    public readonly keys: string[] = [];

    @Inject()
    private readonly startupManager!: StartupManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption(option =>
                option
                    .setName("credential_key")
                    .setDescription("The 2FA key for the credential server.")
                    .setRequired(false)
            )
        ];
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isButton()) {
            return;
        }

        const { customId } = interaction;

        if (!customId.startsWith("restart__yes__") && !customId.startsWith("restart__no__")) {
            return;
        }

        const [, , guildId, channelId, userId, keyId] = customId.split("__");
        const numericKeyId = keyId ? parseInt(keyId) : NaN;
        const isNaN = Number.isNaN(numericKeyId);
        const key = !isNaN ? this.keys.at(parseInt(keyId)) : null;

        if (!isNaN && !key) {
            return;
        }

        if (!guildId || !channelId || !userId) {
            return;
        }

        if (interaction.guildId !== guildId || interaction.channelId !== channelId) {
            return;
        }

        if (interaction.user.id !== userId) {
            await interaction
                .reply({
                    ephemeral: true,
                    content: "That's not under your control!"
                })
                .catch(this.application.logger.debug);
            return;
        }

        if (customId.startsWith("restart__yes__")) {
            const buttons = this.buildButtons(guildId, channelId, userId).map(button =>
                button.setDisabled(true)
            );

            await interaction.update({
                embeds: [
                    {
                        color: 0x007bff,
                        description: `### ${emoji(this.application, "restart")} System Restart\n${emoji(this.application, "loading")} Restarting${key ? " (with one time 2FA code)" : ""}...`
                    }
                ],
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)]
            });

            this.startupManager.requestRestart({
                guildId,
                channelId,
                message: `Restart command was executed by ${interaction.user.username} (${interaction.user.id})`,
                key,
                messageId: interaction.message.id
            });
        }

        if (customId.startsWith("restart__no__")) {
            const buttons = this.buildButtons(guildId, channelId, userId).map(button =>
                button.setDisabled(true)
            );

            await interaction.update({
                embeds: [
                    {
                        color: 0xf14a60,
                        description: `### ${emoji(this.application, "restart")} System Restart\nOperation cancelled.`
                    }
                ],
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)]
            });
        }
    }

    public override async execute(context: Context): Promise<void> {
        if (
            process.env.CREDENTIAL_SERVER &&
            (!context.isChatInput() || context.options.getString("credential_key"))
        ) {
            await context.error("Please enter the credential server 2FA code to restart the bot!");
            return;
        }

        const mfaKey = context.isChatInput() ? context.options.getString("credential_key") : "";

        const reply = await context.reply({
            embeds: [
                {
                    color: 0x007bff,
                    description: `### ${context.emoji("restart")} System Restart\nAre you sure you want to restart the entire system? There will be a slight downtime.`
                }
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    ...this.buildButtons(
                        context.guildId,
                        context.channelId,
                        context.member!.user.id,
                        mfaKey
                    )
                )
            ]
        });

        if (reply) {
            setTimeout(() => {
                reply
                    .edit({
                        embeds: [
                            {
                                color: 0xf14a60,
                                description: `### ${context.emoji("restart")} System Restart\nOperation cancelled due to inactivity.`
                            }
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>().addComponents(
                                ...this.buildButtons(
                                    context.guildId,
                                    context.channelId,
                                    context.member!.user.id,
                                    mfaKey,
                                    true
                                )
                            )
                        ]
                    })
                    .catch(this.application.logger.error);
            }, 180_000); // 3 minutes
        }
    }

    private buildButtons(
        guildId: Snowflake,
        channelId: Snowflake,
        userId: Snowflake,
        key?: string | null,
        disable?: boolean
    ) {
        let keyId = key ? this.keys.indexOf(key) : null;

        if (keyId === -1 && key) {
            this.keys.push(key);
            keyId = this.keys.length - 1;
        }

        return [
            new ButtonBuilder()
                .setCustomId(`restart__yes__${guildId}__${channelId}__${userId}__${keyId}`)
                .setLabel("Restart")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disable ?? false)
                .setEmoji(`${emoji(this.application, "restart") || "🔄"}`),
            new ButtonBuilder()
                .setCustomId(`restart__no__${guildId}__${channelId}__${userId}__${keyId}`)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disable ?? false)
                .setEmoji(`${emoji(this.application, "error") || "❌"}`)
        ];
    }
}

export default RestartCommand;
