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

import Semaphore from "@framework/concurrent/Semaphore";
import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import ClassLoader from "@framework/import/ClassLoader";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import { fetchChannel, fetchMessage } from "@framework/utils/entities";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type DirectiveParsingService from "@main/services/DirectiveParsingService";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildMember,
    type APIEmbed,
    type Interaction
} from "discord.js";

@Name("welcomerService")
class WelcomerService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject("directiveParsingService")
    private readonly directiveParsingService!: DirectiveParsingService;

    private _semaphores: Record<string, Semaphore> = {};

    private _welcomeMessages: Array<string> = [];

    public override async boot() {
        const resource = await ClassLoader.getInstance(this.application).getResource(
            "welcome_messages.json"
        );

        this._welcomeMessages = (await resource?.readJson()) ?? [];
    }

    @GatewayEventListener("guildMemberAdd")
    public async onGuildMemberAdd(member: GuildMember) {
        if (member.user.bot) {
            return;
        }

        const config = this.configManager.config[member.guild.id]?.welcomer;

        if (!config?.enabled) {
            return;
        }

        const channel = await fetchChannel(member.guild, config.channel);

        if (!channel?.isTextBased()) {
            return;
        }

        let options: Parameters<typeof channel.send>[0];

        if (!config.custom_message || config.randomize) {
            const index = Math.floor(Math.random() * this._welcomeMessages.length);
            const content = this.preprocess(this._welcomeMessages[index], member);

            options = {
                content: config.force_embeds ? undefined : content,
                embeds: config.force_embeds
                    ? [{ description: content, color: config.forced_embed_color ?? 0x007bff }]
                    : []
            };
        } else {
            const { data, output } = await this.directiveParsingService.parse(
                this.preprocess(config.custom_message, member)
            );

            options = {
                content: output.trim() === "" ? undefined : output,
                embeds: (data.embeds as APIEmbed[]) ?? [],
                allowedMentions:
                    this.configManager.config[member.guild.id]?.echoing?.allow_mentions !== false ||
                    member.permissions?.has("MentionEveryone", true)
                        ? undefined
                        : { parse: [], roles: [], users: [] }
            };
        }

        if (config.say_hi_button?.enabled) {
            options.components = [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`wsh_${member.id}`)
                        .setLabel(config.say_hi_button.label ?? "Say Hi!")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(config.say_hi_button.emoji)
                )
            ];
        }

        try {
            await channel.send(options);
        } catch (error) {
            this.logger.error(error);
        }
    }

    private preprocess(text: string, member: GuildMember) {
        return text
            .replace(/:mention:/gi, `<@${member.id}>`)
            .replace(/:username:/gi, member.user.username)
            .replace(/:guild:/gi, member.guild.name);
    }

    @GatewayEventListener("interactionCreate")
    public async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isButton() || !interaction.inGuild()) {
            return;
        }

        if (!interaction.customId.startsWith("wsh_")) {
            return;
        }

        const config = this.configManager.config[interaction.guild!.id]?.welcomer;

        if (!config?.enabled || !config?.say_hi_button?.enabled) {
            return;
        }

        this._semaphores[interaction.guildId] ??= new Semaphore();
        const semaphore = this._semaphores[interaction.guildId];
        const wasLocked = semaphore.availablePermits === 0;

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }

        await semaphore.acquire();

        if (wasLocked) {
            try {
                interaction.customId = (
                    await interaction.message.fetch(true)
                ).components[0].components[0].customId!;

                this.logger.debug("Refetched custom ID: ", interaction.customId);
            } catch (e) {
                semaphore.release();
                return;
            }
        }

        const [, memberId, messageId] = interaction.customId.split("_");
        let replyMessage: string | undefined = config.say_hi_button.reply.replace(/<@!?(d+)>/g, "");

        if (typeof replyMessage === "string" && !replyMessage?.includes(":acc:")) {
            this.logger.warn(
                "config.welcomer.say_hi_button.reply does not include :acc: placeholder, defaulting to the built in message"
            );

            replyMessage = undefined;
        }

        welcome: try {
            if (!messageId) {
                const reply = await interaction[
                    interaction.replied || interaction.deferred ? "followUp" : "reply"
                ]({
                    content:
                        replyMessage?.replace(/:acc:/gi, `<@${interaction.user.id}>`) ??
                        `${
                            interaction.user.id === memberId
                                ? "__You__"
                                : interaction.user.toString()
                        }${
                            interaction.user.id === memberId
                                ? " said hi to yourself!"
                                : " says hi to you!"
                        }`,
                    fetchReply: true,
                    allowedMentions: {
                        parse: [],
                        roles: [],
                        users: []
                    }
                });
                const newCustomId = `wsh_${memberId}_${reply.id}`;
                const newActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(newCustomId)
                        .setLabel(config.say_hi_button.label ?? "Say Hi!")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(config.say_hi_button.emoji)
                );

                await interaction.message.edit({
                    components: [newActionRow]
                });

                if (config.delete_after) {
                    const time =
                        interaction.message.createdAt.getTime() + config.delete_after - Date.now();

                    if (time > 1000) {
                        setTimeout(() => {
                            reply.delete().catch(this.application.logger.error);
                        }, time);
                    }
                }
            } else {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferUpdate();
                }

                const message = await fetchMessage(interaction.channel!, messageId);

                if (!message) {
                    break welcome;
                }

                const parts = replyMessage?.split(/:acc:/i);
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

                    break welcome;
                }

                await message.edit({
                    allowedMentions: {
                        parse: [],
                        roles: [],
                        users: []
                    },
                    content:
                        replyMessage === undefined
                            ? `${message.content
                                  .replace(" says hi to you!", "")
                                  .replace(" said hi to yourself!", "")
                                  .trim()}, ${
                                  interaction.user.id === memberId
                                      ? "__You__"
                                      : interaction.user.toString()
                              } says hi to you!`
                            : replyMessage.replace(/:acc:/gi, usersArray!.join(", "))
                });
            }
        } catch (error) {
            this.logger.error(error);
        }

        semaphore.release();
    }
}

export default WelcomerService;
