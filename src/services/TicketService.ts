/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import { Ticket, TicketStatus } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Channel,
    ChannelType,
    Guild,
    GuildTextThreadManager,
    Interaction,
    TextChannel,
    ThreadAutoArchiveDuration,
    ThreadChannel,
    ThreadChannelType,
    User
} from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { Events } from "../types/ClientEvents";
import { RecordValue } from "../types/Utils";
import { userInfo } from "../utils/embed";
import { safeChannelFetch } from "../utils/fetch";
import { logError, logWarn } from "../utils/logger";
import { getComponentEmojiResolvable } from "../utils/utils";
import { GuildConfig } from "./ConfigManager";

export const name = "ticketService";

export default class TicketService extends Service {
    @GatewayEventListener(Events.InteractionCreate)
    async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isButton() || !interaction.customId.startsWith("ticket__")) {
            return;
        }

        const config = this.client.configManager.config[interaction.guildId!]?.tickets;
        const channelConfig = config?.channels![interaction.channelId];

        if (
            !config?.enabled ||
            (channelConfig?.mode === "channel" && !channelConfig?.channel_category) ||
            (channelConfig?.mode === "thread" && !channelConfig?.thread_channel)
        ) {
            return;
        }

        const [, action] = interaction.customId.split("__");

        if (action === "create") {
            await interaction.deferUpdate();

            try {
                const { channel, ticket } = await this.createTicket(interaction.guild!, interaction.user, interaction.channel!);
                await this.sendInitialMessage(ticket, channel, interaction.user);
                await interaction.followUp({
                    ephemeral: true,
                    content: `Ticket created: ${channel.toString()}`
                });
            } catch (error) {
                logError("Failed to create ticket", error);
                await interaction.followUp({
                    ephemeral: true,
                    content: "Failed to create ticket"
                });
            }
        } else {
            logWarn("Unknown ticket action", action);
        }
    }

    async sendInitialMessage(ticket: Ticket, channel: TextChannel | ThreadChannel<boolean>, user: User) {
        const config = this.client.configManager.config[ticket.guildId]?.tickets!.channels![ticket.initiationChannelId];

        if (config?.initial_message) {
            await channel.send({
                content: user.toString(),
                embeds: [
                    {
                        title: `Ticket #${ticket.id}`,
                        description: config.initial_message
                            .replace(/\{user\}/g, user.toString())
                            .replace(/\{ticket\}/g, ticket.id.toString()),
                        fields: [
                            {
                                name: "User",
                                value: userInfo(user),
                                inline: true
                            },
                            {
                                name: "Assigned To",
                                value: "None yet",
                                inline: true
                            },
                            {
                                name: "Ticket ID",
                                value: ticket.id.toString()
                            }
                        ],
                        color: 0x007bff,
                        footer: {
                            text: "Please wait for a staff member to assist you.",
                            icon_url: channel.guild.iconURL() ?? undefined
                        }
                    }
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket__assign__${ticket.id}`)
                            .setLabel("Staff: Assign")
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji("👤"),
                        new ButtonBuilder()
                            .setCustomId(`ticket__lock__${ticket.id}`)
                            .setLabel("Staff: Lock")
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji("🔒"),
                        new ButtonBuilder()
                            .setCustomId(`ticket__archive__${ticket.id}`)
                            .setLabel("Staff: Archive")
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji("📦"),
                        new ButtonBuilder()
                            .setCustomId(`ticket__delete__${ticket.id}`)
                            .setLabel("Staff: Delete")
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji("🗑️")
                    ),
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket__resolve__${ticket.id}`)
                            .setLabel("Resolve")
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(getComponentEmojiResolvable(this.client, "check") ?? "✅")
                    )
                ]
            });
        }
    }

    async createTicket(guild: Guild, user: User, { id }: Channel) {
        const config = this.client.configManager.config[guild.id]?.tickets!;

        return await this.client.prisma.$transaction(async prisma => {
            const ticket = await prisma.ticket.create({
                data: {
                    guildId: guild.id,
                    userId: user.id,
                    channelId: "[updating in a moment]",
                    status: TicketStatus.OPEN,
                    initiationChannelId: id
                }
            });

            const channel = await this.createTicketChannel(ticket.id, guild, user, config.channels![id]!);

            if (!channel) {
                throw new Error("Failed to create ticket channel");
            }

            return {
                ticket: await prisma.ticket.update({
                    where: {
                        id: ticket.id
                    },
                    data: {
                        channelId: channel.id
                    }
                }),
                channel
            };
        });
    }

    async createTicketChannel(id: string | number, guild: Guild, user: User, config: TicketChannelConfig) {
        const name = `ticket-${id}`;
        let channel;

        if (config.mode === "thread") {
            const parentChannel = await safeChannelFetch(guild, config.thread_channel!);

            if (!parentChannel || !("threads" in parentChannel) || !(parentChannel.threads instanceof GuildTextThreadManager)) {
                return null;
            }

            channel = await (parentChannel.threads as GuildTextThreadManager<ThreadChannelType>).create({
                name,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                type:
                    parentChannel.type === ChannelType.GuildAnnouncement
                        ? ChannelType.AnnouncementThread
                        : ChannelType.PrivateThread
            });
        } else {
            const category = await safeChannelFetch(guild, config.channel_category!);

            if (!category || category.type !== ChannelType.GuildCategory) {
                return null;
            }

            channel = await guild.channels.create({
                type: ChannelType.GuildText,
                parent: category.id,
                name,
                topic: `Ticket #${id} for ${user.username}`,
                reason: `Created ticket #${id} for conversation with ${user.username}`
            });
        }

        return channel;
    }

    async sendCreateTicketMessage(initChannel: TextChannel) {
        const config = this.client.configManager.config[initChannel.guild.id]?.tickets!.channels![initChannel.id]!;

        if (!config) {
            return false;
        }

        await initChannel.send({
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId("ticket__create")
                        .setLabel("Create Ticket")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(getComponentEmojiResolvable(this.client, "ticket") ?? "🎫")
                )
            ],
            embeds: [
                {
                    title: config.title ?? "Create a Ticket",
                    description: config.description ?? "Click the button below to create a ticket.",
                    color: config.color ?? 0x007bff,
                    footer: config.footer
                        ? {
                              text: config.footer,
                              icon_url: initChannel.guild.iconURL() ?? undefined
                          }
                        : undefined
                }
            ]
        });

        return true;
    }
}

type TicketChannelConfig = RecordValue<NonNullable<NonNullable<GuildConfig["tickets"]>["channels"]>>;
