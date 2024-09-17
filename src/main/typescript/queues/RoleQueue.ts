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
import { safeMemberFetch } from "../utils/fetch";

type RoleQueuePayload = {
    memberId: Snowflake;
    guildId: Snowflake;
    roleIds: Snowflake[];
    reason?: string;
    mode: "add" | "remove";
    infractionId: number;
};

class RoleQueue extends Queue<RoleQueuePayload> {
    public static override readonly uniqueName = "role";

    public async execute({ guildId, memberId, mode, roleIds, reason }: RoleQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const member = await safeMemberFetch(guild, memberId);

        if (!member) {
            return;
        }

        if (mode === "add") {
            await member.roles.add(roleIds, reason).catch(console.error);
        } else {
            await member.roles.remove(roleIds, reason).catch(console.error);
        }
    }
}

export default RoleQueue;
