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

import { Snowflake } from "discord.js";
import Queue from "../utils/Queue";
import { safeChannelFetch, safeMessageFetch } from "../utils/fetch";
import { logError } from "../utils/logger";

export default class CommandQueue extends Queue {
    async run(channelId: Snowflake, messageId: Snowflake, contentWithoutPrefix: string) {
        try {
            const channel = await safeChannelFetch(this.guild, channelId);

            if (!channel || !channel.isTextBased()) {
                return;
            }

            const message = await safeMessageFetch(channel, messageId);

            if (!message) {
                return;
            }

            message.content = `${this.client.configManager.config[this.guild.id]?.prefix ?? "-"}${contentWithoutPrefix}`;

            message.mentions.users.clear();
            message.mentions.roles.clear();
            message.mentions.channels.clear();

            await this.client.commandManager.runCommandFromMessage(message);
        } catch (e) {
            logError(e);
        }
    }
}
