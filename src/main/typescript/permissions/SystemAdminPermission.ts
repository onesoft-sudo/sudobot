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

import { Inject } from "@framework/container/Inject";
import { Logger } from "@framework/log/Logger";
import { Permission } from "@framework/permissions/Permission";
import { GuildMember } from "discord.js";
import type ConfigurationManager from "../services/ConfigurationManager";


class SystemAdminPermission extends Permission {
    protected override readonly name = "system.admin";

    @Inject("configManager")
    private readonly configManager!: ConfigurationManager;

    @Inject()
    private readonly logger!: Logger;

    public override async validate(member: GuildMember): Promise<boolean> {
        const has = this.configManager.systemConfig.system_admins.includes(member.id);

        if (has) {
            this.logger.debug(`User @${member.user.username} has system.admin permission`);
        } else {
            this.logger.debug(
                `User @${member.user.username} does not have system.admin permission`
            );
        }

        return has;
    }
}

export default SystemAdminPermission;
