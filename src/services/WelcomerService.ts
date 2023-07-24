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
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, Interaction, time } from "discord.js";
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

    @GatewayEventListener("ready")
    async onReady() {
        log("Loading welcome messages...");
        this.welcomeMessages = JSON.parse(await readFile(sudoPrefix(`resources/welcome_messages.json`), { encoding: 'utf-8' }));
    }

    @GatewayEventListener("guildMemberAdd")
    async onGuildMemberAdd(member: GuildMember) {
        if (member.user.bot)
            return;

        const { welcomer } = this.client.configManager.config[member.guild.id];

        if (!welcomer?.enabled)
            return;

        const { channel: channelId, embed, say_hi_button, custom_message, randomize, mention, say_hi_expire_after } = welcomer;

        if (!custom_message && !randomize)
            return;

        try {
            const channel = member.guild.channels.cache.get(channelId) ?? await member.guild.channels.fetch(channelId);

            if (!channel)
                return;

            if (!channel.isTextBased())
                return;

            const actionRow = say_hi_button ? [this.generateActionRow(member.user.id, welcomer)] : undefined

            const reply = await channel.send({
                content: `${mention ? member.user.toString() + '\n' : ''}${!embed ? this.generateContent(member, welcomer) : ''}`,
                embeds: embed ? [this.generatedEmbed(member, welcomer)] : undefined,
                components: actionRow
            });


            if (actionRow && say_hi_button) {
                setTimeout(() => {
                    const row = actionRow;

                    row[0].components[0].setDisabled(true);

                    reply.edit({
                        components: row
                    }).catch(logError);
                }, say_hi_expire_after);
            }
        }
        catch (e) {
            logError(e);
            return;
        }
    }

    @GatewayEventListener("interactionCreate")
    async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isButton())
            return;

        if (!interaction.guild?.id || !this.client.configManager.config[interaction.guild.id].welcomer?.say_hi_button || !interaction.customId.startsWith(`welcomer_say_hi__`))
            return;

        const [, memberId, messageId] = interaction.customId.split('__');
        const saysHiToYou = ` says hi to you!`;

        if (!messageId) {
            const reply = await interaction.reply({
                content: `${interaction.user.id === memberId ? "__You__" : interaction.user.toString()}${interaction.user.id === memberId ? " said hi to yourself!" : saysHiToYou}`,
                fetchReply: true
            });

            const newCustomId = `welcomer_say_hi__${memberId}__${reply.id}`;

            const actionRow = this.generateActionRow(memberId, { say_hi_emoji: this.client.configManager.config[interaction.guild.id].welcomer?.say_hi_emoji! });

            actionRow.components[0].setCustomId(newCustomId);

            await interaction.message.edit({
                components: [
                    actionRow
                ]
            });
        }
        else {
            try {
                await interaction.deferUpdate();
                const message = interaction.channel?.messages.cache.get(messageId) ?? await interaction.channel?.messages.fetch(messageId);

                if (!message)
                    return;

                if ((interaction.user.id === memberId && message.content.includes("__You__")) ||
                    (interaction.user.id !== memberId && message.content.includes(`${interaction.user.toString()}`))) {
                    await interaction.followUp({
                        content: `You've already said hi to ${interaction.user.id === memberId ? "yourself!" : "the user!"}`,
                        ephemeral: true
                    });

                    return;
                }

                await message.edit({
                    content: `${message.content.replace(saysHiToYou, '').replace(" said hi to yourself!", '')}, ${interaction.user.id === memberId ? "__You__" : interaction.user.toString()}${saysHiToYou}`
                });
            }
            catch (e) {
                logError(e);
            }
        }
    }

    generateActionRow(memberId: string, { say_hi_emoji }: Pick<NotUndefined<GuildConfig["welcomer"]>, 'say_hi_emoji'>) {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`welcomer_say_hi__${memberId}`)
                    .setEmoji(!say_hi_emoji || say_hi_emoji === "default" ? "👋" : say_hi_emoji)
                    .setLabel("Say Hi!")
                    .setStyle(ButtonStyle.Secondary)
            );
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
        const message = `${randomize ? `${this.pickRandomWelcomeMessage()}\n` : ''}${custom_message ? custom_message : ''}`;
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
            },
            color: welcomer.color
        }).setTimestamp();
    }
}
