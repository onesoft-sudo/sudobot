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
 *
 * ------
 * Also remember one thing, we do a little trolling :)
 */

import { Message, type Snowflake } from "discord.js";
import type Client from "../core/Client";
import { CommandMessage } from "../core/Command";

export async function protectSystemAdminsFromCommands(
    client: Client,
    message: CommandMessage,
    userId: Snowflake,
    commandKey: "bean_safe" | "shot_safe" | "fakeban_safe"
) {
    const config = client.configManager.config[message.guildId!]?.commands?.[commandKey];

    if (
        userId === client.user!.id ||
        client.configManager.systemConfig.system_admins.includes(userId) ||
        (!client.configManager.systemConfig.system_admins.includes(message.member!.user.id) &&
            config &&
            config.includes(userId))
    ) {
        const content = [
            "https://tenor.com/view/no-gif-25913746",
            "https://tenor.com/view/no-heck-no-no-way-never-shake-head-gif-17734098"
        ][Math.floor(Math.random() * 2)];

        if (message instanceof Message) {
            await message.reply(content).catch(client.logger.error);
        } else {
            if (message.deferred) {
                await message.editReply(content).catch(client.logger.error);
            } else {
                await message.reply(content).catch(client.logger.error);
            }
        }

        return true;
    }

    return false;
}
