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
import type { Snowflake } from "discord.js";
import { italic } from "discord.js";
import { safeMemberFetch } from "../utils/fetch";

type UnmuteQueuePayload = {
    memberId: Snowflake;
    guildId: Snowflake;
    infractionId: number;
};

class UnmuteQueue extends Queue<UnmuteQueuePayload> {
    public static override readonly uniqueName = "unmute";

    public async execute({ guildId, memberId }: UnmuteQueuePayload) {
        this.application.logger.debug("Unmuting member");

        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const member = await safeMemberFetch(guild, memberId);

        if (!member) {
            return;
        }

        const result = await this.application
            .service("infractionManager")
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
    }
}

export default UnmuteQueue;
