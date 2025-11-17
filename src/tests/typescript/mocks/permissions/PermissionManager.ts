import type { GetPermissionsResult } from "@framework/permissions/AbstractPermissionManager";
import AbstractPermissionManager from "@framework/permissions/AbstractPermissionManager";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "@framework/permissions/PermissionResolvable";
import type { Awaitable, GuildMember, APIInteractionGuildMember, Role, GuildBasedChannel, User } from "discord.js";

class PermissionManager extends AbstractPermissionManager {
    public override hasPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<boolean> {
        return super.hasPermissions(user, permissions, systemPermissions);
    }

    public override getPermissions(member: GuildMember | APIInteractionGuildMember): Awaitable<GetPermissionsResult> {
        return super.getPermissions(member);
    }

    public override getPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override getPermissionsOnRole(
        _member: GuildMember | APIInteractionGuildMember,
        _targetRole: Role
    ): Awaitable<GetPermissionsResult> {
        throw new Error("Method not implemented.");
    }

    public override getPermissionsOnMember(
        _member: GuildMember | APIInteractionGuildMember,
        _targetMember: GuildMember | APIInteractionGuildMember
    ): Awaitable<GetPermissionsResult> {
        throw new Error("Method not implemented.");
    }

    public override hasPermissionsOnChannel(
        _member: GuildMember | APIInteractionGuildMember,
        _targetChannel: GuildBasedChannel,
        _permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        throw new Error("Method not implemented.");
    }

    public override hasPermissionsOnRole(
        _member: GuildMember | APIInteractionGuildMember,
        _targetRole: Role,
        _permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        throw new Error("Method not implemented.");
    }

    public override hasPermissionsOnMember(
        _member: GuildMember | APIInteractionGuildMember,
        _targetMember: GuildMember | APIInteractionGuildMember,
        _permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        throw new Error("Method not implemented.");
    }
}

export default PermissionManager;
