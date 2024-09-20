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

type VerificationExpiredQueuePayload = {
    memberId: Snowflake;
    guildId: Snowflake;
};

class VerificationExpiredQueue extends Queue<VerificationExpiredQueuePayload> {
    public static override readonly uniqueName = "verification_expired";

    public async execute({ guildId, memberId }: VerificationExpiredQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const config =
            this.application.service("configManager").config[guildId]?.member_verification;

        if (!config?.enabled) {
            return;
        }

        await this.application
            .service("verificationService")
            .onVerificationExpire(guildId, memberId);
    }
}

export default VerificationExpiredQueue;
