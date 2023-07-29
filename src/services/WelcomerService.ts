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
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder, GuildMember, Interaction, time } from "discord.js";
import { readFile } from "fs/promises";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { NotUndefined } from "../types/NotUndefined";
import { log, logError } from "../utils/logger";
import { sudoPrefix } from "../utils/utils";
import { GuildConfig } from "./ConfigManager";

export const name = "welcomer";

export default class WelcomerService extends Service {
    welcomeMessages: string[] = [];
    workingState = false;

    @GatewayEventListener("ready")
    async onReady() {
        log("Loading welcome messages...");
        this.welcomeMessages = JSON.parse(await readFile(sudoPrefix(`resources/welcome_messages.json`), { encoding: "utf-8" }));
    }

    @GatewayEventListener("guildMemberAdd")
    async onGuildMemberAdd(member: GuildMember) {
        if (member.user.bot) return;

        const config = this.client.configManager.config[member.guild.id];

        if (!config) return;

        const { welcomer } = config;

        if (!welcomer?.enabled) return;

        const { channel: channelId, embed, say_hi_button, custom_message, randomize, mention, say_hi_expire_after, delete_messages } = welcomer;

        if (!custom_message && !randomize) return;

        try {
            const channel = member.guild.channels.cache.get(channelId) ?? (await member.guild.channels.fetch(channelId));

            if (!channel) return;

            if (!channel.isTextBased()) return;

            const actionRow = say_hi_button
                ? [
                      this.generateActionRow(member.user.id, {
                          say_hi_emoji: welcomer.say_hi_emoji
                      })
                  ]
                : undefined;

            const reply = await channel.send({
                content: `${mention ? member.user.toString() + "\n" : ""}${!embed ? this.generateContent(member, welcomer) : ""}`,
                embeds: embed ? [this.generatedEmbed(member, welcomer)] : undefined,
                components: actionRow
            });

            if (delete_messages) {
                setTimeout(() => {
                    reply.delete().catch(logError);
                }, delete_messages);
            }

            if (actionRow && say_hi_button && say_hi_expire_after) {
                setTimeout(() => {
                    const row = actionRow;

                    row[0].components[0].setDisabled(true);

                    reply
                        .edit({
                            components: row
                        })
                        .catch(logError);
                }, say_hi_expire_after);
            }
        } catch (e) {
            logError(e);
            return;
        }
    }

    @GatewayEventListener("interactionCreate")
    async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isButton()) return;

        const config = this.client.configManager.config[interaction.guild!.id];

        if (!config) return;

        if (!interaction.guild?.id || !config.welcomer?.say_hi_button || !interaction.customId.startsWith(`welcomer_say_hi__`)) return;

        if (this.workingState) {
            await interaction[interaction.replied ? "followUp" : "reply"]({
                content: `Whoa there! Please calm down! I had to ratelimit this request to prevent spam.`,
                ephemeral: true
            });

            return;
        }

        this.workingState = true;

        const [, memberId, messageId] = interaction.customId.split("__");
        const saysHiToYou = ` says hi to you!`;

        try {
            if (!messageId) {
                const reply = await interaction.reply({
                    content: `${interaction.user.id === memberId ? "__You__" : interaction.user.toString()}${
                        interaction.user.id === memberId ? " said hi to yourself!" : saysHiToYou
                    }`,
                    fetchReply: true
                });

                const newCustomId = `welcomer_say_hi__${memberId}__${reply.id}`;

                const actionRow = this.generateActionRow(memberId, {
                    say_hi_emoji: config.welcomer?.say_hi_emoji!
                });

                actionRow.components[0].setCustomId(newCustomId);

                await interaction.message.edit({
                    components: [actionRow]
                });

                if (config.welcomer.delete_messages) {
                    const time = interaction.message.createdAt.getTime() + config.welcomer.delete_messages - Date.now();

                    if (time > 1000) {
                        setTimeout(() => {
                            reply.delete().catch(logError);
                        }, time);
                    }
                }
            } else {
                try {
                    await interaction.deferUpdate();
                    const message = interaction.channel?.messages.cache.get(messageId) ?? (await interaction.channel?.messages.fetch(messageId));

                    if (!message) {
                        this.workingState = false;
                        return;
                    }

                    if (
                        (interaction.user.id === memberId && message.content.includes("__You__")) ||
                        (interaction.user.id !== memberId && message.content.includes(`${interaction.user.toString()}`))
                    ) {
                        await interaction.followUp({
                            content: `You've already said hi to ${interaction.user.id === memberId ? "yourself!" : "the user!"}`,
                            ephemeral: true
                        });

                        this.workingState = false;
                        return;
                    }

                    await message.edit({
                        content: `${message.content.replace(saysHiToYou, "").replace(" said hi to yourself!", "")}, ${
                            interaction.user.id === memberId ? "__You__" : interaction.user.toString()
                        }${saysHiToYou}`
                    });
                } catch (e) {
                    logError(e);
                    this.workingState = false;
                }
            }

            this.workingState = false;
        } catch (e) {
            logError(e);
            this.workingState = false;
        }
    }

    generateActionRow(memberId: string, { say_hi_emoji }: Pick<NotUndefined<GuildConfig["welcomer"]>, "say_hi_emoji">) {
        const emoji =
            !say_hi_emoji || say_hi_emoji === "default"
                ? "👋"
                : this.client.emojis.cache.find(e => e.name === say_hi_emoji || e.identifier === say_hi_emoji);
        const button = new ButtonBuilder().setCustomId(`welcomer_say_hi__${memberId}`).setLabel("Say Hi!").setStyle(ButtonStyle.Secondary);

        if (emoji) button.setEmoji(emoji.toString());

        return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
    }

    pickRandomWelcomeMessage() {
        return this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)];
    }

    replacePlaceholders(member: GuildMember, message: string) {
        return message
            .replace(/:tag:/gi, member.user.tag)
            .replace(/:discriminator:/gi, member.user.discriminator)
            .replace(/:createdAt:/gi, `${time(member.user.createdTimestamp)}`)
            .replace(/:age:/gi, formatDistanceToNowStrict(member.user.createdTimestamp))
            .replace(/:mention:/gi, member.user.toString())
            .replace(/:guild:/gi, member.guild.name);
    }

    generateContent(member: GuildMember, { custom_message, randomize, mention }: NotUndefined<GuildConfig["welcomer"]>) {
        const message = `${randomize ? `${this.pickRandomWelcomeMessage()}\n` : ""}${custom_message ? custom_message : ""}`;
        return this.replacePlaceholders(member, message);
    }

    generatedEmbed(member: GuildMember, welcomer: NotUndefined<GuildConfig["welcomer"]>) {
        return new EmbedBuilder({
            author: {
                name: member.user.username,
                icon_url: member.displayAvatarURL()
            },
            description: this.generateContent(member, welcomer),
            footer: {
                text: "Welcome"
            }
        })
            .setColor(welcomer.color as ColorResolvable)
            .setTimestamp();
    }
}
