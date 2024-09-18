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

import Queue from "@framework/queues/Queue";
import { fetchChannel, fetchMember } from "@framework/utils/entities";
import type {
    MessageCreateOptions,
    MessagePayload,
    MessageReplyOptions,
    Snowflake
} from "discord.js";

type CommandExecutionQueuePayload = {
    guildId: Snowflake;
    memberId: Snowflake;
    messageId: Snowflake;
    channelId: Snowflake;
    commandString: string;
    fromInteraction: boolean;
};

class CommandExecutionQueue extends Queue<CommandExecutionQueuePayload> {
    public static override readonly uniqueName = "command_execution";

    private cloneObject(obj: object) {
        const clonedObj = Object.create(Object.getPrototypeOf(obj));

        for (const key of Reflect.ownKeys(obj)) {
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);

            if (descriptor) {
                Object.defineProperty(clonedObj, key, descriptor);
            }
        }

        return clonedObj;
    }

    public async execute({
        guildId,
        memberId,
        channelId,
        commandString,
        messageId,
        fromInteraction
    }: CommandExecutionQueuePayload) {
        const prefix = this.application.service("configManager").config[guildId]?.prefix;

        if (!prefix) {
            this.application.logger.error(`No prefix found for guild ${guildId}`);
            return;
        }

        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const channel = await fetchChannel(guild, channelId);

        if (!channel?.isTextBased()) {
            return;
        }

        const message = await channel.messages.fetch(messageId);

        if (!message) {
            return;
        }

        const copy = this.cloneObject(message);

        copy!.reply = (...args: [MessagePayload | MessageReplyOptions | string]) =>
            message.reply(...(args as [MessageCreateOptions | string]));
        copy!.delete = () => Promise.resolve(message);
        copy!.react = () =>
            Promise.resolve(null as unknown as ReturnType<NonNullable<typeof message>["react"]>);

        copy.content = `${prefix}${commandString}`;
        copy.channelId = channel.id;

        Object.defineProperty(copy, "channel", {
            get: () => channel
        });

        Object.defineProperty(copy, "url", {
            get: () => `https://discord.com/channels/${message.guild.id}/${channel.id}/${messageId}`
        });

        Object.defineProperty(copy, "guild", {
            get: () => guild
        });

        Object.defineProperty(copy, "mentions", {
            value: message.mentions,
            enumerable: true,
            configurable: true,
            writable: false
        });

        if (!fromInteraction && copy.author.id !== memberId) {
            this.application.logger.error(
                `Invalid message author for message ${message.id} in guild ${guild.id}`
            );

            return;
        }

        const member = await fetchMember(guild, memberId);

        if (!member) {
            this.application.logger.error(
                `Invalid member for message ${message.id} in guild ${guild.id}`
            );

            return;
        }

        copy.author = member.user;

        Object.defineProperty(copy, "member", {
            value: member,
            enumerable: true,
            configurable: true
        });

        if (
            (await this.application.service("commandManager").runCommandFromMessage(copy)) === false
        ) {
            this.application.logger.error(
                `Failed to run command from message ${message.id} in guild ${guild.id}`
            );
        }
    }
}

export default CommandExecutionQueue;
