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
import { fetchUser } from "@framework/utils/entities";
import { Colors } from "@main/constants/Colors";
import { formatDistanceToNowStrict } from "date-fns";
import type { Snowflake } from "discord.js";

type ReminderQueuePayload = {
    message: string;
    userId: Snowflake;
    createdAt: string;
};

class ReminderQueue extends Queue<ReminderQueuePayload> {
    public static override readonly uniqueName = "reminder";

    public async execute({ message, userId, createdAt }: ReminderQueuePayload) {
        const user = await fetchUser(this.application.client, userId);

        if (!user) {
            return;
        }

        await user
            .send({
                embeds: [
                    {
                        title: "Reminder Notification",
                        description: message,
                        color: Colors.Primary,
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: `You set this reminder ${formatDistanceToNowStrict(new Date(createdAt), { addSuffix: true })}`
                        }
                    }
                ]
            })
            .catch(this.application.logger.error);
    }
}

export default ReminderQueue;
