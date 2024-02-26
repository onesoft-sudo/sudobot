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

import { Ballot } from "@prisma/client";
import { CacheType, EmbedBuilder, Interaction, Snowflake } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { log, logError } from "../utils/Logger";
import { getEmoji } from "../utils/utils";

export const name = "ballotManager";

export default class BallotManager extends Service implements HasEventListeners {
    protected readonly changedBallots = new Map<`${Snowflake}_${Snowflake}_${Snowflake}`, Ballot>();
    protected readonly recentUsers = new Map<Snowflake, number>();
    protected readonly cooldown = 3000;
    protected readonly updateInterval = 10_000;
    protected timeout: Timer | null = null;
    protected updateTimeout: Timer | null = null;

    @GatewayEventListener("interactionCreate")
    async onInteractionCreate(interaction: Interaction<CacheType>) {
        if (!interaction.isButton() || !interaction.customId.startsWith("ballot__")) {
            return;
        }

        const [, mode] = interaction.customId.split("__");

        if (mode !== "upvote" && mode !== "downvote") {
            return;
        }

        const lastRequest = this.recentUsers.get(interaction.user.id);

        if (lastRequest !== undefined && lastRequest <= this.cooldown) {
            await interaction.reply({
                ephemeral: true,
                content: `${getEmoji(this.client, "error")} Whoa there! Please wait for ${Math.ceil(
                    (this.cooldown - lastRequest) / 1000
                )} seconds before trying to upvote/downvote again!`
            });

            return;
        }

        this.timeout ??= setTimeout(() => {
            for (const [userId, lastRequest] of this.recentUsers) {
                if (lastRequest >= this.cooldown) {
                    this.recentUsers.delete(userId);
                }
            }

            this.timeout = null;
        }, this.cooldown);

        this.recentUsers.set(interaction.user.id, Date.now());

        await interaction.deferReply({
            ephemeral: true
        });

        const key = `${interaction.guildId!}_${interaction.channelId!}_${interaction.message.id}` as const;
        const ballot =
            this.changedBallots.get(key) ??
            (await this.client.prisma.ballot.findFirst({
                where: {
                    guildId: interaction.guildId!,
                    channelId: interaction.channelId!,
                    messageId: interaction.message.id
                }
            }));

        if (!ballot) {
            return;
        }

        log("Before", ballot.upvotes, ballot.downvotes);
        const previousTotalVotes = ballot.upvotes.length - ballot.downvotes.length;

        const added = this.modifyBallotVotes(ballot, interaction.user.id, mode);

        log("After", ballot.upvotes, ballot.downvotes);

        this.changedBallots.set(key, ballot);

        this.updateTimeout ??= setTimeout(() => {
            for (const [, ballot] of this.changedBallots) {
                log("Updating ballot: ", ballot.id);
                this.client.prisma.ballot
                    .updateMany({
                        where: {
                            id: ballot.id,
                            guildId: interaction.guildId!
                        },
                        data: {
                            upvotes: {
                                set: ballot.upvotes
                            },
                            downvotes: {
                                set: ballot.downvotes
                            }
                        }
                    })
                    .catch(logError);
            }

            this.changedBallots.clear();
        }, this.updateInterval);

        const newTotalVotes = ballot.upvotes.length - ballot.downvotes.length;

        if (newTotalVotes !== previousTotalVotes) {
            await interaction.message.edit({
                embeds: [
                    new EmbedBuilder(interaction.message.embeds[0].data).setFooter({
                        text: `${newTotalVotes} Vote${newTotalVotes === 1 ? "" : "s"} • React to vote!`
                    })
                ]
            });
        }

        await interaction.editReply({
            content: `Successfully ${added === null ? "changed" : added ? "added" : "removed"} your vote! If you want to ${
                added === false ? "add" : "remove"
            } your vote${added === false ? " back" : ""}, press the same button again.`
        });
    }

    private modifyBallotVotes(ballot: Ballot, userId: Snowflake, mode: "upvote" | "downvote") {
        const upvoteIndex = ballot.upvotes.indexOf(userId);
        const downvoteIndex = ballot.downvotes.indexOf(userId);

        if (upvoteIndex !== -1 && downvoteIndex !== -1) {
            mode === "upvote" ? ballot.downvotes.splice(downvoteIndex, 1) : ballot.upvotes.splice(upvoteIndex, 1);
            return false;
        } else if (upvoteIndex === -1 && downvoteIndex === -1) {
            mode === "upvote" ? ballot.upvotes.push(userId) : ballot.downvotes.push(userId);
            return true;
        } else {
            if (mode === "upvote") {
                upvoteIndex === -1 ? ballot.upvotes.push(userId) : ballot.upvotes.splice(upvoteIndex, 1);
                downvoteIndex === -1 ? null : ballot.downvotes.splice(downvoteIndex, 1);
            } else {
                downvoteIndex === -1 ? ballot.downvotes.push(userId) : ballot.downvotes.splice(downvoteIndex, 1);
                upvoteIndex === -1 ? null : ballot.upvotes.splice(upvoteIndex, 1);
            }

            return mode === "upvote"
                ? downvoteIndex !== -1
                    ? null
                    : upvoteIndex === -1
                : upvoteIndex !== -1
                ? null
                : downvoteIndex === -1;
        }
    }

    create({
        content,
        guildId,
        userId,
        files,
        channelId,
        messageId,
        anonymous
    }: {
        content: string;
        guildId: Snowflake;
        channelId: Snowflake;
        messageId: Snowflake;
        userId: Snowflake;
        files?: string[];
        anonymous?: boolean;
    }) {
        return this.client.prisma.ballot.create({
            data: {
                content,
                guildId,
                userId,
                files,
                channelId,
                messageId,
                anonymous
            }
        });
    }

    delete({ id, guildId }: { id: number; guildId: Snowflake }) {
        return this.client.prisma.ballot.deleteMany({
            where: {
                id,
                guildId
            }
        });
    }

    upvote({ id, guildId, userId }: { id: number; guildId: Snowflake; userId: Snowflake }) {
        return this.client.prisma.ballot.updateMany({
            where: {
                id,
                guildId
            },
            data: {
                upvotes: {
                    push: userId
                }
            }
        });
    }

    downvote({ id, guildId, userId }: { id: number; guildId: Snowflake; userId: Snowflake }) {
        return this.client.prisma.ballot.updateMany({
            where: {
                id,
                guildId
            },
            data: {
                downvotes: {
                    push: userId
                }
            }
        });
    }

    async upvoteRemove({ id, guildId, userId }: { id: number; guildId: Snowflake; userId: Snowflake }) {
        const ballot = await this.get({ id, guildId });

        if (!ballot || ballot.upvotes.length === 0) {
            return { count: 0 };
        }

        return this.client.prisma.ballot.updateMany({
            where: {
                id,
                guildId
            },
            data: {
                upvotes: {
                    set: ballot.upvotes.filter(id => id !== userId)
                }
            }
        });
    }

    async downvoteRemove({ id, guildId, userId }: { id: number; guildId: Snowflake; userId: Snowflake }) {
        const ballot = await this.get({ id, guildId });

        if (!ballot || ballot.downvotes.length === 0) {
            return { count: 0 };
        }

        return this.client.prisma.ballot.updateMany({
            where: {
                id,
                guildId
            },
            data: {
                downvotes: {
                    set: ballot.downvotes.filter(id => id !== userId)
                }
            }
        });
    }

    get({ id, guildId }: { id: number; guildId: Snowflake }) {
        return this.client.prisma.ballot.findFirst({
            where: {
                id,
                guildId
            }
        });
    }
}
