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

import { Inject } from "@framework/container/Inject";
import { GatewayEventListener } from "@framework/events/GatewayEventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { HasEventListeners } from "@framework/types/HasEventListeners";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import { GuildMember } from "discord.js";

@Name("autoRoleService")
class AutoRoleService extends Service implements HasEventListeners {
    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @GatewayEventListener("guildMemberAdd")
    public async onGuildMemberAdd(member: GuildMember) {
        const config = this.configManager.config[member.guild.id]?.auto_role;

        if (!config?.enabled || (member.user.bot && config.ignore_bots) || !member.manageable) {
            return;
        }

        await member.roles
            .add(config.roles, "Automatic: Auto-Role Service")
            .catch(this.application.logger.error);
    }
}

export default AutoRoleService;
