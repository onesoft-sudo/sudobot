import type { GuildMember, GuildBasedChannel, Awaitable, Role } from "discord.js";
import type { GetPermissionsResult } from "./AbstractPermissionManager";
import AbstractPermissionManager from "./AbstractPermissionManager";
import type { RawPermissionResolvable } from "./PermissionResolvable";

abstract class AbstractImplicitPermissionManager extends AbstractPermissionManager {
    public override getPermissionsOnChannel(
        member: GuildMember,
        _targetChannel: GuildBasedChannel
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override getPermissionsOnRole(
        member: GuildMember,
        _targetRole: Role
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override getPermissionsOnMember(
        member: GuildMember,
        _targetMember: GuildMember
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override hasPermissionsOnChannel(
        member: GuildMember,
        _targetChannel: GuildBasedChannel,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        return this.hasPermissions(member, permissions);
    }

    public override hasPermissionsOnRole(
        member: GuildMember,
        _targetRole: Role,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        return this.hasPermissions(member, permissions);
    }

    public override hasPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;

    public override async hasPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember,
        permissions: RawPermissionResolvable
    ): Promise<boolean> {
        return member.roles.highest.position > targetMember.roles.highest.position && await this.hasPermissions(member, permissions);
    }
}

export default AbstractImplicitPermissionManager;
