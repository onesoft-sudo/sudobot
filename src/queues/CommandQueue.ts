/*
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
    Collection,
    GuildMember,
    MessageCreateOptions,
    MessagePayload,
    MessageReplyOptions,
    Snowflake,
    TextChannel
} from "discord.js";
import { log, logError } from "../utils/Logger";
import Queue from "../utils/Queue";
import { safeChannelFetch, safeMemberFetch, safeMessageFetch } from "../utils/fetch";

export default class CommandQueue extends Queue {
    cloneObject(obj: object) {
        const clonedObj = Object.create(Object.getPrototypeOf(obj));

        for (const key of Reflect.ownKeys(obj)) {
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);

            if (descriptor) {
                Object.defineProperty(clonedObj, key, descriptor);
            }
        }

        return clonedObj;
    }

    copyCollection<K, V>(destination: Collection<K, V>, source: Collection<K, V>) {
        for (const [key, value] of source) {
            destination.set(key, value);
        }
    }

    async run(channelId: Snowflake, messageId: Snowflake, contentWithoutPrefix: string) {
        try {
            const channel = await safeChannelFetch(this.guild, channelId);

            if (!channel || !channel.isTextBased()) {
                return;
            }

            let message = await safeMessageFetch(channel, messageId);
            let member = message?.member as GuildMember | null;

            if (!message) {
                message =
                    (this.guild.channels.cache.find(c => c.isTextBased() && c.lastMessage) as TextChannel | null)?.lastMessage ??
                    null;

                member = await safeMemberFetch(this.guild, this.userId);

                if (message) {
                    message = this.cloneObject(message);

                    message!.reply = (...args: [MessagePayload | MessageReplyOptions | string]) =>
                        channel.send(...(args as [MessageCreateOptions | string]));
                    message!.delete = () => Promise.resolve(message!);
                    message!.react = () => Promise.resolve(null as unknown as ReturnType<NonNullable<typeof message>["react"]>);
                }
            } else {
                message = this.cloneObject(message);
            }

            if (!member) {
                log("Aborting command queue as the member who ran the command was not found.");
                return;
            }

            if (!message) {
                log(
                    "Aborting command queue as no message alternative strategy can be used to run this command queue in a safe sandbox."
                );
                return;
            }

            const userMentions = message.mentions.users.clone();
            const roleMentions = message.mentions.roles.clone();
            const memberMentions = message.mentions.members?.clone();
            const channelMentions = message.mentions.channels.clone();

            message.mentions.users.clear();
            message.mentions.roles.clear();
            message.mentions.members?.clear();
            message.mentions.channels.clear();

            message.mentions.users = userMentions;
            message.mentions.roles = roleMentions;

            if (message.mentions.members && memberMentions) {
                this.copyCollection(message.mentions.members, memberMentions);
            }

            this.copyCollection(message.mentions.channels, channelMentions);

            message.content = `${this.client.configManager.config[this.guild.id]?.prefix ?? "-"}${contentWithoutPrefix}`;
            message.channelId = channel.id;

            if (member) {
                Object.defineProperty(message, "member", {
                    get: () => member
                });

                Object.defineProperty(message, "author", {
                    get: () => member?.user
                });
            }

            Object.defineProperty(message, "channel", {
                get: () => channel
            });

            Object.defineProperty(message, "url", {
                get: () => `https://discord.com/channels/${this.guild.id}/${channel.id}/${messageId}`
            });

            await this.client.commandManager.runCommandFromMessage(message);
        } catch (e) {
            logError(e);
        }
    }
}
