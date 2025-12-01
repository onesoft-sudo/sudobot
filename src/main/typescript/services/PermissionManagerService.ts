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

import { Inject } from "@framework/container/Inject";
import type AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager";
import type PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface";
import Service from "@framework/services/Service";
import { Collection, ReadonlyCollection, type Snowflake } from "discord.js";
import ConfigurationManagerService, { ConfigurationType } from "./ConfigurationManagerService";
import { GuildConfigurationType } from "@schemas/GuildConfigurationSchema";
import SELinuxPermissionManager from "@framework/selinux/SELinuxPermissionManager";
import Application from "@main/core/Application";
import Permission from "@framework/permissions/Permission";
import SystemAdminPermission from "@main/permissions/SystemAdminPermission";
import DiscordPermissionManager from "@framework/permissions/DiscordPermissionManager";
import { SystemPermissionResolvable } from "@framework/permissions/PermissionResolvable";
import LeveledPermissionManager from "@main/security/LeveledPermissionManager";

export const SERVICE_PERMISSION_MANAGER = "permissionManagerService" as const;

type PermissionModeString = NonNullable<GuildConfigurationType["permissions"]>["mode"];

class PermissionManagerService extends Service implements PermissionManagerServiceInterface {
    public override readonly name = SERVICE_PERMISSION_MANAGER;
    public readonly permissionObjects: ReadonlyCollection<string, Permission> = new Collection(
        [SystemAdminPermission].map(c => {
            const object = Permission.resolve(this.application, c);
            return [object.name, object];
        })
    );
    public readonly systemAdminPermission: SystemPermissionResolvable = SystemAdminPermission;

    private readonly permissionManagerRecord: Record<PermissionModeString, AbstractPermissionManager>;

    public constructor(application: Application) {
        super(application);
        this.permissionManagerRecord = this.createManagers(application);
    }

    protected createManagers(application: Application): typeof this.permissionManagerRecord {
        const permissionObjects = [...this.permissionObjects.values()];

        return {
            discord: new DiscordPermissionManager(application, permissionObjects, this.systemAdminPermission),
            leveled: new LeveledPermissionManager(application, permissionObjects, this.systemAdminPermission),
            selinux: new SELinuxPermissionManager(application, permissionObjects, this.systemAdminPermission)
        };
    }

    @Inject()
    private readonly configurationManagerService!: ConfigurationManagerService;

    public async getPermissionManager(guildId?: Snowflake): Promise<AbstractPermissionManager> {
        const { permissions } = await this.configurationManagerService.get(
            guildId ? ConfigurationType.Guild : ConfigurationType.DirectMessage,
            guildId ?? "0"
        );

        const mode = permissions?.mode ?? "discord";
        return this.permissionManagerRecord[mode] || this.permissionManagerRecord.discord;
    }
}

export default PermissionManagerService;
