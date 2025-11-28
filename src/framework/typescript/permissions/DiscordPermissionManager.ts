import type { GuildMember, APIInteractionGuildMember, User, Awaitable } from "discord.js";
import AbstractImplicitPermissionManager from "./AbstractImplicitPermissionManager";
import type { GetPermissionsResult } from "./AbstractPermissionManager";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "./PermissionResolvable";

class DiscordPermissionManager extends AbstractImplicitPermissionManager {
    public override async getPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        systemPermissions: Iterable<SystemPermissionResolvable> = this.permissionObjects
    ): Promise<GetPermissionsResult> {
        return {
            customPermissions: systemPermissions ? await this.customPermissionCheck(systemPermissions, user) : [],
            discordPermissions: this.resolveDiscordPermissions(user),
            grantAll: false
        };
    }

    public override hasPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<boolean> {
        return super.hasPermissions(user, permissions, systemPermissions);
    }
}

export default DiscordPermissionManager;
