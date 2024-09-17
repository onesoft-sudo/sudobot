/*
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

import Queue from "@framework/queues/Queue";
import { fetchChannel, fetchMessage } from "@framework/utils/entities";
import type { Snowflake } from "discord.js";

type MessageDeleteQueuePayload = {
    guildId: Snowflake;
    channelId: Snowflake;
    messageId: Snowflake;
};

class MessageDeleteQueue extends Queue<MessageDeleteQueuePayload> {
    public static override readonly uniqueName = "message_delete";

    public async execute({ guildId, channelId, messageId }: MessageDeleteQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const channel = await fetchChannel(guild, channelId);

        if (!channel?.isTextBased()) {
            return;
        }

        const message = await fetchMessage(channel, messageId);

        if (!message) {
            return;
        }

        await message.delete().catch(console.error);
    }
}

export default MessageDeleteQueue;
