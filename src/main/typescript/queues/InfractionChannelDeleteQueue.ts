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
import { fetchChannel } from "@framework/utils/entities";
import type { Snowflake } from "discord.js";

type InfractionChannelDeleteQueuePayload = {
    channelId: Snowflake;
    type: "channel" | "thread";
};

class InfractionChannelDeleteQueue extends Queue<InfractionChannelDeleteQueuePayload> {
    public static override readonly uniqueName = "infraction_channel_delete";

    public async execute({ channelId, type }: InfractionChannelDeleteQueuePayload) {
        const guild = this.application.client.guilds.cache.get(this.guildId);

        if (!guild) {
            return;
        }

        const config = this.application.service("configManager").config[this.guildId]?.infractions;

        if (!config || config.dm_fallback === "none") {
            return;
        }

        if (type === "channel") {
            const channel = await fetchChannel(this.guildId, channelId);

            if (channel && channel.parentId === config.dm_fallback_parent_channel) {
                await channel.delete("Deleting infraction channel after expiration");
            }
        } else {
            const channel = await fetchChannel(this.guildId, channelId);

            if (!channel || !("threads" in channel)) {
                return;
            }

            try {
                const thread = await channel.threads.fetch(channelId);
                thread?.delete("Deleting infraction thread after expiration");
            } catch {
                return;
            }
        }
    }
}

export default InfractionChannelDeleteQueue;
