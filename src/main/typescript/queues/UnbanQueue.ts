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
import type { Snowflake } from "discord.js";
import { safeUserFetch } from "../utils/fetch";

type UnbanQueuePayload = {
    userId: Snowflake;
    guildId: Snowflake;
    infractionId: number;
};

class UnbanQueue extends Queue<UnbanQueuePayload> {
    public static override readonly uniqueName = "unban";

    public async execute({ guildId, userId }: UnbanQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const user = await safeUserFetch(this.application.client, userId);

        if (!user) {
            return;
        }

        await this.application
            .service("infractionManager")
            .createUnban({
                guildId: guild.id,
                moderator: this.application.client.user!,
                reason: "Automatic unban after temporary ban expiration",
                user
            })
            .catch(console.error);
    }
}

export default UnbanQueue;
