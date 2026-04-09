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

import AbstractQueuedJob from "@framework/queues/AbstractQueuedJob";
import JobState from "@framework/queues/JobState";
import { fetchChannel } from "@framework/utils/entities";
import ConfigurationManagerService, {
    ConfigurationType
} from "@main/services/ConfigurationManagerService";
import type { Snowflake } from "discord.js";

type InfractionChannelDeleteQueuePayload = {
    guildId: Snowflake;
    channelId: Snowflake;
    type: "channel" | "thread";
};

class InfractionChannelDeleteQueue extends AbstractQueuedJob<InfractionChannelDeleteQueuePayload> {
    public override get name() {
        return "infraction_channel_delete";
    }

    public async execute({
        guildId,
        channelId,
        type
    }: InfractionChannelDeleteQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return JobState.Failure;
        }

        const config = (
            await this.application
                .service(ConfigurationManagerService)
                .get(ConfigurationType.Guild, guildId)
        )?.infractions;

        if (!config || config.dm_fallback === "none") {
            return JobState.Failure;
        }

        if (type === "channel") {
            const channel = await fetchChannel(guildId, channelId);

            if (
                channel &&
                channel.parentId === config.dm_fallback_parent_channel
            ) {
                await channel.delete(
                    "Deleting infraction channel after expiration"
                );
            }
        } else {
            const channel = await fetchChannel(guildId, channelId);

            if (!channel || !("threads" in channel)) {
                return JobState.Failure;
            }

            try {
                const thread = await channel.threads.fetch(channelId);
                void thread
                    ?.delete("Deleting infraction thread after expiration")
                    .catch(this.application.logger.error);
            } catch {
                return JobState.Failure;
            }
        }

        return JobState.Success;
    }
}

export default InfractionChannelDeleteQueue;
