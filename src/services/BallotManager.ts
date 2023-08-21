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
import { Snowflake } from "discord.js";
import Service from "../core/Service";

export const name = "ballotManager";

export default class BallotManager extends Service {
    protected readonly changedBallots: Ballot[] = [];

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
