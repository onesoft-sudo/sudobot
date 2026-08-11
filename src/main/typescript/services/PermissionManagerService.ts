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

import { Inject } from "@framework/container/Inject.js";
import type AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager.js";
import DiscordPermissionManager from "@framework/permissions/DiscordPermissionManager.js";
import Permission from "@framework/permissions/Permission.js";
import type PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface.js";
import { SystemPermissionResolvable } from "@framework/permissions/PermissionResolvable.js";
import SELinuxPermissionManager from "@framework/selinux/SELinuxPermissionManager.js";
import Service from "@framework/services/Service.js";
import Application from "@main/core/Application.js";
import SystemAdminPermission from "@main/permissions/SystemAdminPermission.js";
import LayeredPermissionManager from "@main/security/LayeredPermissionManager.js";
import LeveledPermissionManager from "@main/security/LeveledPermissionManager.js";
import { ServiceID } from "@main/core/ServiceID.js";
import { GuildConfigurationType } from "@schemas/all.js";
import {
    Awaitable,
    Collection,
    ReadonlyCollection,
    type Snowflake
} from "discord.js";
import ConfigurationManagerService, {
    ConfigurationType
} from "./ConfigurationManagerService.js";

type PermissionModeString = NonNullable<
    GuildConfigurationType["permissions"]
>["mode"];

class PermissionManagerService
    extends Service
    implements PermissionManagerServiceInterface
{
    public override readonly name = ServiceID.PERMISSION_MANAGER;
    public readonly permissionObjects: ReadonlyCollection<string, Permission> =
        new Collection(
            [SystemAdminPermission].map(c => {
                const object = Permission.resolve(this.application, c);
                return [object.name, object];
            })
        );
    public readonly systemAdminPermission: SystemPermissionResolvable =
        SystemAdminPermission;

    private readonly permissionManagerRecord: Record<
        PermissionModeString,
        AbstractPermissionManager
    >;

    public constructor(application: Application) {
        super(application);
        this.permissionManagerRecord = this.createManagers(application);
    }

    public override boot(): Awaitable<void> {
        Permission.globalBypassPermissions.add(
            SystemAdminPermission.getInstance(this.application)
        );
    }

    protected createManagers(
        application: Application
    ): typeof this.permissionManagerRecord {
        const permissionObjects = [...this.permissionObjects.values()];

        return {
            discord: new DiscordPermissionManager(
                application,
                permissionObjects,
                this.systemAdminPermission
            ),
            leveled: new LeveledPermissionManager(
                application,
                permissionObjects,
                this.systemAdminPermission
            ),
            layered: new LayeredPermissionManager(
                application,
                permissionObjects,
                this.systemAdminPermission
            ),
            selinux: new SELinuxPermissionManager(
                application,
                permissionObjects,
                this.systemAdminPermission
            )
        };
    }

    @Inject()
    private readonly configurationManagerService!: ConfigurationManagerService;

    public async getPermissionManager(
        guildId?: Snowflake
    ): Promise<AbstractPermissionManager> {
        const { permissions } = await this.configurationManagerService.get(
            guildId ? ConfigurationType.Guild : ConfigurationType.DirectMessage,
            guildId ?? "0"
        );

        const mode = permissions?.mode ?? "discord";

        if (
            mode === "selinux" &&
            (!guildId ||
                !this.configurationManagerService.systemConfig.guilds_with_selinux_permission_mode_allowed.includes(
                    guildId
                ))
        ) {
            return this.permissionManagerRecord.discord;
        }

        return (
            this.permissionManagerRecord[mode] ||
            this.permissionManagerRecord.discord
        );
    }
}

export default PermissionManagerService;
