/**
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

import { GuildMember } from "discord.js";
import Service from "../core/Service";
import { GatewayEventListener } from "../decorators/GatewayEventListener";
import { HasEventListeners } from "../types/HasEventListeners";
import { logError } from "../utils/Logger";

export const name = "autoRoleService";

export default class AutoRoleService extends Service implements HasEventListeners {
    @GatewayEventListener("guildMemberAdd")
    onGuildMemberAdd(member: GuildMember) {
        const config = this.client.configManager.config[member.guild.id]?.autorole;

        if (!config?.enabled || (config.ignore_bots && member.user.bot)) {
            return;
        }

        member.roles.add(config.roles).catch(logError);
    }
}
