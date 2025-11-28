import type { GuildMember, APIInteractionGuildMember, GuildBasedChannel, Awaitable, Role } from "discord.js";
import type { GetPermissionsResult } from "./AbstractPermissionManager";
import AbstractPermissionManager from "./AbstractPermissionManager";
import type { RawPermissionResolvable } from "./PermissionResolvable";

abstract class AbstractImplicitPermissionManager extends AbstractPermissionManager {
    public override getPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember,
        _targetChannel: GuildBasedChannel
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override getPermissionsOnRole(
        member: GuildMember | APIInteractionGuildMember,
        _targetRole: Role
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override getPermissionsOnMember(
        member: GuildMember | APIInteractionGuildMember,
        _targetMember: GuildMember | APIInteractionGuildMember
    ): Awaitable<GetPermissionsResult> {
        return this.getPermissions(member);
    }

    public override hasPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember,
        _targetChannel: GuildBasedChannel,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        return this.hasPermissions(member, permissions);
    }

    public override hasPermissionsOnRole(
        member: GuildMember | APIInteractionGuildMember,
        _targetRole: Role,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        return this.hasPermissions(member, permissions);
    }

    public override hasPermissionsOnMember(
        member: GuildMember | APIInteractionGuildMember,
        _targetMember: GuildMember | APIInteractionGuildMember,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean> {
        return this.hasPermissions(member, permissions);
    }
}

export default AbstractImplicitPermissionManager;
