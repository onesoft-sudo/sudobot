/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import type AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager";
import type PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface";
import Service from "@framework/services/Service";
import type { Snowflake, Awaitable } from "discord.js";
import PermissionManager from "./PermissionManager";

class PermissionManagerService extends Service implements PermissionManagerServiceInterface {
    public override name = "permissionManagerService";
    private readonly permissionManager = new PermissionManager(this.application, [], null);

    public getPermissionManager(_guildId?: Snowflake): Awaitable<AbstractPermissionManager> {
        return this.permissionManager;
    }
}

export default PermissionManagerService;
