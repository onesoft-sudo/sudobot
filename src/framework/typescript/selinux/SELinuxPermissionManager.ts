import AbstractPermissionManager, { type GetPermissionsResult } from "@framework/permissions/AbstractPermissionManager";
import type { PermissionResolvable } from "@framework/permissions/PermissionResolvable";
import { TODO } from "@framework/utils/devflow";
import type { GuildMember, User, Awaitable, GuildBasedChannel, Role } from "discord.js";
import PolicyManager from "./PolicyManager";

class SELinuxPermissionManager extends AbstractPermissionManager {
    private readonly policyManager = new PolicyManager();

    public override hasPermissions(_user: GuildMember | User, _permissions: PermissionResolvable): Awaitable<boolean> {
        TODO();
    }

    public override getPermissions(_user: GuildMember | User): Awaitable<GetPermissionsResult> {
        TODO();
    }

    public override getPermissionsOnChannel(
        _member: GuildMember,
        _targetChannel: GuildBasedChannel
    ): Awaitable<GetPermissionsResult> {
        TODO();
    }

    public override getPermissionsOnRole(_member: GuildMember, _targetRole: Role): Awaitable<GetPermissionsResult> {
        TODO();
    }

    public override getPermissionsOnUser(_member: GuildMember, _targetUser: User): Awaitable<GetPermissionsResult> {
        TODO();
    }

    public override getPermissionsOnMember(_member: GuildMember, _targetMember: GuildMember): Awaitable<GetPermissionsResult> {
        TODO();
    }

    public override hasPermissionsOnChannel(
        _member: GuildMember,
        _targetChannel: GuildBasedChannel,
        _permissions: PermissionResolvable
    ): Awaitable<boolean> {
        TODO();
    }

    public override hasPermissionsOnRole(
        _member: GuildMember,
        _targetRole: Role,
        _permissions: PermissionResolvable
    ): Awaitable<boolean> {
        TODO();
    }

    public override hasPermissionsOnUser(
        _member: GuildMember,
        _targetUser: User,
        _permissions: PermissionResolvable
    ): Awaitable<boolean> {
        TODO();
    }

    public override hasPermissionsOnMember(
        _member: GuildMember,
        _targetMember: GuildMember,
        _permissions: PermissionResolvable
    ): Awaitable<boolean> {
        TODO();
    }
}

export default SELinuxPermissionManager;
