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
import type { InfractionCreatePayload } from "@main/models/Infraction";
import { infractions, InfractionType } from "@main/models/Infraction";
import { LogEventType } from "@main/schemas/LoggingSchema";
import type { Snowflake } from "discord.js";

type MassUnbanQueuePayload = {
    userIds: Snowflake[];
    guildId: Snowflake;
};

class MassUnbanQueue extends Queue<MassUnbanQueuePayload> {
    public static override readonly uniqueName = "mass_unban";

    public async execute({ guildId, userIds }: MassUnbanQueuePayload) {
        const guild = this.application.client.guilds.cache.get(guildId);

        if (!guild) {
            return;
        }

        const infractionCreatePayloads: InfractionCreatePayload[] = [];
        const reason = "Automatic unban after temporary mass-ban expiration";

        for (const id of userIds) {
            try {
                await guild.bans.remove(id, reason);

                infractionCreatePayloads.push({
                    guildId: guild.id,
                    moderatorId: this.application.client.user!.id,
                    reason,
                    userId: id,
                    type: InfractionType.Unban
                });
            } catch (error) {
                this.application.logger.error(error);
            }
        }

        if (infractionCreatePayloads.length > 0) {
            await this.application.database.drizzle
                .insert(infractions)
                .values(infractionCreatePayloads)
                .catch(console.error);
        }

        this.application
            .service("auditLoggingService")
            .emitLogEvent(guildId, LogEventType.MemberMassUnban, {
                guild,
                moderator: this.application.client.user!,
                reason,
                users: userIds
            })
            .catch(this.application.logger.error);
    }
}

export default MassUnbanQueue;
