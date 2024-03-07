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
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CacheType,
    ChatInputCommandInteraction,
    Interaction,
    SlashCommandBuilder,
    Snowflake
} from "discord.js";
import { writeFile } from "fs/promises";
import path from "path";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";
import { logError } from "../../utils/Logger";
import { sudoPrefix } from "../../utils/utils";

export default class RestartCommand extends Command implements HasEventListeners {
    public readonly name = "restart";
    public readonly validationRules: ValidationRule[] = [];
    public readonly aliases = ["reboot"];
    public readonly systemAdminOnly = true;
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("credential_key").setDescription("The key to authenticate with the credentials server, if needed")
    );
    public readonly keys: string[] = [];

    public readonly description = "Restarts the bot.";

    @GatewayEventListener("interactionCreate")
    async onInteractionCreate(interaction: Interaction<CacheType>) {
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
                .catch(logError);
            return;
        }

        if (customId.startsWith("restart__yes__")) {
            const buttons = this.buildButtons(guildId, channelId, userId).map(button => button.setDisabled(true));

            await interaction.update({
                embeds: [
                    {
                        color: 0x007bff,
                        title: "System Restart",
                        description: `${this.emoji("loading")} Restarting${key ? " (with one time 2FA code)" : ""}...`
                    }
                ],
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)]
            });

            const json = JSON.stringify(
                {
                    guildId,
                    channelId,
                    messageId: interaction.message.id,
                    time: Date.now(),
                    key
                },
                null,
                4
            );

            await writeFile(path.join(sudoPrefix("tmp", true), "restart.json"), json);
            process.exit(this.client.configManager.systemConfig.restart_exit_code);
        }

        if (customId.startsWith("restart__no__")) {
            const buttons = this.buildButtons(guildId, channelId, userId).map(button => button.setDisabled(true));

            await interaction.update({
                embeds: [
                    {
                        color: 0xf14a60,
                        title: "System Restart",
                        description: "Operation cancelled."
                    }
                ],
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)]
            });
        }
    }

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        if (
            process.env.CREDENTIAL_SERVER &&
            (!(message instanceof ChatInputCommandInteraction) || !message.options.getString("credential_key"))
        ) {
            await this.error(message, "Please enter the credential server 2FA code to restart the bot!");
            return;
        }

        const mfaKey = message instanceof ChatInputCommandInteraction ? message.options.getString("credential_key") : "";

        const reply = await this.deferredReply(message, {
            embeds: [
                {
                    color: 0x007bff,
                    title: "System Restart",
                    description: "Are you sure you want to restart the entire system? The bot might go offline for some time."
                }
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    ...this.buildButtons(message.guildId!, message.channelId!, message.member!.user.id, mfaKey)
                )
            ]
        });

        if (reply) {
            setTimeout(() => {
                reply.edit({
                    embeds: [
                        {
                            color: 0xf14a60,
                            title: "System Restart",
                            description: "Operation cancelled due to inactivity."
                        }
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            ...this.buildButtons(message.guildId!, message.channelId!, message.member!.user.id, mfaKey, true)
                        )
                    ]
                });
            }, 180_000); // 3 minutes
        }
    }

    buildButtons(guildId: Snowflake, channelId: Snowflake, userId: Snowflake, key?: string | null, disable?: boolean) {
        let keyId = key ? this.keys.indexOf(key) : null;

        if (keyId === -1 && key) {
            this.keys.push(key);
            keyId = this.keys.length - 1;
        }

        return [
            new ButtonBuilder()
                .setCustomId(`restart__yes__${guildId}__${channelId}__${userId}__${keyId}`)
                .setLabel("Restart")
                .setStyle(ButtonStyle.Success)
                .setDisabled(disable ?? false),
            new ButtonBuilder()
                .setCustomId(`restart__no__${guildId}__${channelId}__${userId}__${keyId}`)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disable ?? false)
        ];
    }
}
