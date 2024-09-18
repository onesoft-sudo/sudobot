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

import type Application from "@framework/app/Application";
import type Context from "@framework/commands/Context";
import { type Snowflake } from "discord.js";

export function protectSystemAdminsFromCommands(
    application: Application,
    context: Context,
    userId: Snowflake
) {
    const configManager = application.service("configManager");
    const immuneUsers = configManager.config[context.guildId]?.commands?.troll_command_immune_users;

    if (
        userId === application.client.user!.id ||
        configManager.systemConfig.system_admins.includes(userId) ||
        (!configManager.systemConfig.system_admins.includes(context.user.id) &&
            immuneUsers &&
            immuneUsers.includes(userId))
    ) {
        const content = [
            "https://tenor.com/view/no-gif-25913746",
            "https://tenor.com/view/no-heck-no-no-way-never-shake-head-gif-17734098"
        ][Math.floor(Math.random() * 2)];

        context.reply(content).catch(application.logger.error);
        return true;
    }

    return false;
}
