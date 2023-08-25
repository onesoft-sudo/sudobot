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

import { AfkEntry } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import { ChannelType, GuildMember, Message, Snowflake, escapeMarkdown, time } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { logError } from "../utils/logger";

export const name = "afkService";

export default class AFKService extends Service implements HasEventListeners {
    protected readonly entries = new Map<Snowflake, AfkEntry>();
    protected readonly syncTimeoutDelay = 15_000;
    protected syncTimeout: NodeJS.Timeout | null = null;
    protected readonly modifiedIds = new Set<string>();

    @GatewayEventListener("ready")
    async onReady() {
        const entries = await this.client.prisma.afkEntry.findMany();

        for (const entry of entries) {
            this.entries.set(`${entry.guildId}_${entry.userId}`, entry);
        }
    }

    isAFK(guildId: string, userId: string) {
        return this.entries.has(`${guildId}_${userId}`);
    }

    toggle(guildId: string, userId: string, reason?: string) {
        if (this.isAFK(guildId, userId)) {
            return this.removeAFK(guildId, userId);
        }

        return this.startAFK(guildId, userId, reason);
    }

    async removeAFK(guildId: string, userId: string, shouldAwait: boolean = true) {
        const entry = this.entries.get(`${guildId}_${userId}`)!;

        if (!entry) {
            return null;
        }

        const promise = this.client.prisma.afkEntry.deleteMany({
            where: {
                id: entry.id
            }
        });

        shouldAwait ? await promise : null;

        this.entries.delete(`${guildId}_${userId}`);
        return entry;
    }

    async startAFK(guildId: string, userId: string, reason?: string) {
        const entry = await this.client.prisma.afkEntry.create({
            data: {
                guildId,
                userId,
                reason
            }
        });

        this.entries.set(`${guildId}_${userId}`, entry);
        return entry;
    }

    addMentions(guildId: string, userId: string, mentions: { userId: Snowflake; messageLink: string }[]) {
        if (!this.isAFK(guildId, userId)) {
            return false;
        }

        const entry = this.entries.get(`${guildId}_${userId}`)!;

        if (entry.mentions.length >= 10) {
            return false;
        }

        entry.mentions.push(...mentions.map(m => `${m.userId}__${m.messageLink}__${new Date().toISOString()}`));
        this.modifiedIds.add(`${guildId}_${userId}`);
        this.queueSync();

        return true;
    }

    queueSync() {
        this.syncTimeout ??= setTimeout(() => {
            for (const guildId_UserId of this.modifiedIds) {
                const entry = this.entries.get(guildId_UserId);

                if (!entry) {
                    continue;
                }

                this.client.prisma.afkEntry.updateMany({
                    where: {
                        id: entry.id
                    },
                    data: entry
                });
            }
        }, this.syncTimeoutDelay);
    }

    @GatewayEventListener("messageCreate")
    async onMessageCreate(message: Message<boolean>) {
        if (message.author.bot || !message.guild || message.channel.type === ChannelType.DM) {
            return;
        }

        if (this.isAFK(message.guildId!, message.author.id)) {
            const entry = await this.removeAFK(message.guildId!, message.author.id, false);

            await message.reply({
                embeds: [
                    {
                        color: 0x007bff,
                        description: this.client.afkService.generateAFKEndMessage(entry)
                    }
                ],
                allowedMentions: {
                    users: []
                }
            });
        }

        if (message.mentions.users.size === 0) {
            return;
        }

        let description = "";
        const users = message.mentions.users.filter(user => this.isAFK(message.guildId!, user.id));

        if (users.size === 0) {
            return;
        }

        for (const [id] of users) {
            this.addMentions(message.guildId!, id, [
                {
                    messageLink: message.url,
                    userId: message.author.id
                }
            ]);
        }

        if (users.size === 1) {
            const entry = this.entries.get(`${message.guildId!}_${users.at(0)!.id}`);
            description = `<@${users.at(0)!.id}> is AFK right now${
                entry?.reason ? `, for reason: **${escapeMarkdown(entry?.reason)}**` : ""
            }.`;
        } else {
            description = "The following users are AFK right now: \n\n";

            for (const [id] of users) {
                if (this.isAFK(message.guildId!, id)) {
                    const entry = this.entries.get(`${message.guildId!}_${id}`);
                    description += `* <@${id}>: ${entry?.reason ?? "*No reason provided*"} ${
                        entry?.createdAt ? `(${time(entry?.createdAt!)})` : ""
                    }\n`;
                }
            }
        }

        if (description.trim() === "") {
            return;
        }

        message
            .reply({
                embeds: [
                    {
                        color: 0x007bff,
                        description
                    }
                ],
                allowedMentions: {
                    users: []
                }
            })
            .catch(logError);
    }

    @GatewayEventListener("guildMemberRemove")
    onGuildMemberRemove(member: GuildMember) {
        if (this.isAFK(member.guild.id, member.user.id)) {
            this.removeAFK(member.guild.id, member.user.id).catch(logError);
        }
    }

    generateAFKEndMessage(entry: AfkEntry | null | undefined) {
        return (
            `You're no longer AFK. You had **${entry?.mentions.length ?? 0}** mentions in this server.` +
            (entry?.mentions?.length
                ? "\n\n" +
                  entry.mentions
                      .map(data => {
                          const [userId, messageLink, dateISO] = data.split("__");
                          return `From <@${userId}>, ${formatDistanceToNowStrict(new Date(dateISO), {
                              addSuffix: true
                          })} [Navigate](${messageLink})`;
                      })
                      .join("\n")
                : "")
        );
    }
}
