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

import { Mutex } from "async-mutex";
import { formatDistanceToNowStrict } from "date-fns";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ColorResolvable,
    ComponentEmojiResolvable,
    EmbedBuilder,
    GuildMember,
    Interaction,
    Snowflake,
    time
} from "discord.js";
import { readFile } from "fs/promises";
import JSON5 from "json5";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { NotUndefined } from "../types/NotUndefined";
import { log, logError, logWarn } from "../utils/Logger";
import { pick, sudoPrefix } from "../utils/utils";
import { GuildConfig } from "./ConfigManager";

export const name = "welcomer";

export default class WelcomerService extends Service {
    welcomeMessages: string[] = [];
    mutexes: Record<Snowflake, Mutex | undefined> = {};

    @GatewayEventListener("ready")
    async onReady() {
        log("Loading welcome messages...");
        this.welcomeMessages = JSON5.parse(
            await readFile(sudoPrefix("resources/welcome_messages.json"), { encoding: "utf-8" })
        );
    }

    @GatewayEventListener("guildMemberAdd")
    async onGuildMemberAdd(member: GuildMember) {
        if (member.user.bot) return;

        const config = this.client.configManager.config[member.guild.id];

        if (!config) return;

        const { welcomer } = config;

        if (!welcomer?.enabled) return;

        const {
            channel: channelId,
            embed,
            say_hi_button,
            custom_message,
            randomize,
            mention,
            say_hi_expire_after,
            delete_messages
        } = welcomer;

        if (!custom_message && !randomize) return;

        try {
            const channel =
                member.guild.channels.cache.get(channelId) ??
                (await member.guild.channels.fetch(channelId));

            if (!channel) return;

            if (!channel.isTextBased()) return;

            const actionRow = say_hi_button
                ? [
                      this.generateActionRow(member.user.id, {
                          say_hi_emoji: welcomer.say_hi_emoji,
                          say_hi_label: welcomer.say_hi_label
                      })
                  ]
                : undefined;

            const reply = await channel.send({
                content: `${mention ? member.user.toString() + "\n" : ""}${
                    !embed ? this.generateContent(member, welcomer) : ""
                }`,
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

        if (
            !interaction.guild?.id ||
            !config.welcomer?.say_hi_button ||
            !interaction.customId.startsWith("welcomer_say_hi__")
        )
            return;

        this.mutexes[interaction.guildId!] ??= new Mutex();
        const wasLocked = this.mutexes[interaction.guildId!]!.isLocked();

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }

        const release = await this.mutexes[interaction.guildId!]!.acquire();
        const saysHiToYou = " says hi to you!";

        if (wasLocked) {
            try {
                interaction.customId = (
                    await interaction.message.fetch(true)
                ).components[0].components[0].customId!;
                log("Refetched custom ID: ", interaction.customId);
            } catch (e) {
                release();
                return;
            }
        }

        const [, memberId, messageId] = interaction.customId.split("__");
        let sayHiReply =
            this.client.configManager.config[interaction.guildId!]?.welcomer?.say_hi_reply;

        if (typeof sayHiReply === "string" && !sayHiReply?.includes(":mentions:")) {
            logWarn(
                "config.welcomer.say_hi_reply does not include :mentions: placeholder, defaulting to the built in message"
            );

            sayHiReply = undefined;
        }

        try {
            if (!messageId) {
                const reply = await interaction[
                    interaction.replied || interaction.deferred ? "followUp" : "reply"
                ]({
                    content:
                        sayHiReply?.replace(/:mentions:/gi, `<@${interaction.user.id}>`) ??
                        `${
                            interaction.user.id === memberId
                                ? "__You__"
                                : interaction.user.toString()
                        }${
                            interaction.user.id === memberId ? " said hi to yourself!" : saysHiToYou
                        }`,
                    fetchReply: true
                });

                const newCustomId = `welcomer_say_hi__${memberId}__${reply.id}`;

                const actionRow = this.generateActionRow(memberId, {
                    say_hi_emoji: config.welcomer?.say_hi_emoji,
                    say_hi_label: config.welcomer?.say_hi_label
                });

                actionRow.components[0].setCustomId(newCustomId);

                await interaction.message.edit({
                    components: [actionRow]
                });

                if (config.welcomer.delete_messages) {
                    const time =
                        interaction.message.createdAt.getTime() +
                        config.welcomer.delete_messages -
                        Date.now();

                    if (time > 1000) {
                        setTimeout(() => {
                            reply.delete().catch(logError);
                        }, time);
                    }
                }
            } else {
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferUpdate();
                    }

                    const message =
                        interaction.channel?.messages.cache.get(messageId) ??
                        (await interaction.channel?.messages.fetch(messageId));

                    if (!message) {
                        release();
                        return;
                    }

                    const parts = sayHiReply?.split(/:mentions:/i);
                    let contentOrUsers: string | string[] = message.content;
                    let usersArray: string[] | undefined;

                    if (parts !== undefined) {
                        let content = message.content;

                        for (const part of parts) {
                            content = content.replace(part.trim(), "");
                        }

                        content = content.trim();

                        const users = content
                            .split(/\s*,\s*/)
                            .filter((part, index, array) => array.lastIndexOf(part) === index);

                        contentOrUsers = [...users];

                        if (!users.includes(`<@${interaction.user.id}>`)) {
                            users.push(`<@${interaction.user.id}>`);
                        }

                        usersArray = users;
                    }

                    if (
                        contentOrUsers.includes(`${interaction.user.toString()}`) ||
                        (interaction.user.id === memberId && contentOrUsers.includes("__You__"))
                    ) {
                        await interaction.followUp({
                            content: `You've already said hi to ${
                                interaction.user.id === memberId ? "yourself!" : "the user!"
                            }`,
                            ephemeral: true
                        });

                        release();
                        return;
                    }

                    await message.edit({
                        content:
                            sayHiReply === undefined
                                ? `${message.content
                                      .replace(saysHiToYou, "")
                                      .replace(" said hi to yourself!", "")
                                      .trim()}, ${
                                      interaction.user.id === memberId
                                          ? "__You__"
                                          : interaction.user.toString()
                                  }${saysHiToYou}`
                                : sayHiReply.replace(/:mentions:/gi, usersArray!.join(", "))
                    });
                } catch (e) {
                    logError(e);
                }
            }
        } catch (e) {
            logError(e);
        }

        release();
    }

    generateActionRow(
        memberId: string,
        {
            say_hi_emoji,
            say_hi_label
        }: Pick<NotUndefined<GuildConfig["welcomer"]>, "say_hi_emoji" | "say_hi_label">
    ) {
        const emoji =
            !say_hi_emoji || say_hi_emoji === "default"
                ? "👋"
                : this.client.emojis.cache.find(
                      e => e.name === say_hi_emoji || e.identifier === say_hi_emoji
                  );
        const button = new ButtonBuilder()
            .setCustomId(`welcomer_say_hi__${memberId}`)
            .setLabel(say_hi_label ?? "Say Hi!")
            .setStyle(ButtonStyle.Secondary);

        if (emoji)
            button.setEmoji(
                typeof emoji === "string"
                    ? emoji
                    : pick(emoji as Exclude<ComponentEmojiResolvable, string>, [
                          "id",
                          "name",
                          "animated"
                      ])
            );

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

    generateContent(
        member: GuildMember,
        { custom_message, randomize }: NotUndefined<GuildConfig["welcomer"]>
    ) {
        const message = `${randomize ? `${this.pickRandomWelcomeMessage()}\n` : ""}${
            custom_message ? custom_message : ""
        }`;
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
