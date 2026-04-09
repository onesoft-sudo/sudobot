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
import { safeMemberFetch } from "@framework/utils/fetch";
import type InfractionManagerService from "@main/services/InfractionManagerService";
import { SERVICE_INFRACTION_MANAGER } from "@main/services/InfractionManagerService";
import { italic, type Snowflake } from "discord.js";

type UnbanQueuePayload = {
    memberId: Snowflake;
    guildId: Snowflake;
    infractionId: number;
};

class UnbanQueue extends AbstractQueuedJob<UnbanQueuePayload> {
    public override get name(): string {
        return "unban";
    }

    public async execute({ guildId, memberId }: UnbanQueuePayload) {
        this.application.logger.debug("Unmuting member");

        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return JobState.Failure;
        }

        const member = await safeMemberFetch(guild, memberId);

        if (!member) {
            return JobState.Failure;
        }

        const result = await this.application
            .service<InfractionManagerService>(SERVICE_INFRACTION_MANAGER)
            .createUnmute({
                guildId: guild.id,
                moderator: this.application.client.user!,
                reason: italic("Your mute has expired"),
                member
            })
            .catch(console.error);

        if (result?.status === "success") {
            this.application.logger.debug("Member unmuted");
        } else {
            this.application.logger.debug("Failed to unmute member");
        }

        return JobState.Success;
    }
}

export default UnbanQueue;
