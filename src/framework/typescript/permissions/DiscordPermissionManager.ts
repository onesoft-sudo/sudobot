import type { GuildMember, User, Awaitable } from "discord.js";
import AbstractImplicitPermissionManager from "./AbstractImplicitPermissionManager";
import type { GetPermissionsResult } from "./AbstractPermissionManager";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "./PermissionResolvable";

class DiscordPermissionManager extends AbstractImplicitPermissionManager {
    public override async getPermissions(
        user: GuildMember | User,
        systemPermissions: Iterable<SystemPermissionResolvable> = this.permissionObjects.values()
    ): Promise<GetPermissionsResult> {
        return {
            customPermissions: systemPermissions ? await this.customPermissionCheck(systemPermissions, user) : undefined,
            discordPermissions: this.resolveDiscordPermissions(user),
            grantAll: false
        };
    }

    public override hasPermissions(
        user: GuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<boolean> {
        return super.hasPermissions(user, permissions, systemPermissions);
    }
}

export default DiscordPermissionManager;
