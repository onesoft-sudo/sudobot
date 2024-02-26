/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import Queue from "../utils/Queue";
import { safeChannelFetch } from "../utils/fetch";
import { logError } from "../utils/Logger";

export default class BumpReminderQueue extends Queue {
    async run(userId: string, channelId: string) {
        try {
            const channel = await safeChannelFetch(this.guild, channelId);

            if (!channel || !channel.isTextBased()) {
                return;
            }

            const config = this.client.configManager.config[this.guild.id]?.bump_reminder;
            const { disabled_channels, remind_after: remindAfter, enabled, on_bump_content, reminder_content } = config ?? {};

            if (!enabled || disabled_channels?.includes(channelId)) {
                return;
            }

            await channel.send(
                await this.client.bumpReminder.replacePlaceholders(
                    reminder_content ?? ":mention:\nTime to bump the server! Run the `/bump` slash command from Disboard Bot.",
                    {
                        userId,
                        remindAfter
                    }
                )
            );
        } catch (e) {
            logError(e);
        }
    }
}
