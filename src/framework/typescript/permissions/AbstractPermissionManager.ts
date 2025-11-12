import type { Awaitable, GuildBasedChannel, GuildMember, Role, User } from "discord.js";
import type { PermissionResolvable } from "./PermissionResolvable";
import type Permission from "./Permission";
import type Application from "@framework/app/Application";

export type GetPermissionsResult = {
    discordPermissions: bigint;
    customPermissions: Permission[];
    grantAll: boolean;
};

abstract class AbstractPermissionManager {
    protected readonly application: Application;

    public constructor(application: Application) {
        this.application = application;
    }

    public abstract hasPermissions(user: GuildMember | User, permissions: PermissionResolvable): Awaitable<boolean>;
    public abstract getPermissions(user: GuildMember | User): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnChannel(
        member: GuildMember,
        targetChannel: GuildBasedChannel
    ): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnRole(member: GuildMember, targetRole: Role): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnUser(member: GuildMember, targetUser: User): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember
    ): Awaitable<GetPermissionsResult>;
    public abstract hasPermissionsOnChannel(
        member: GuildMember,
        targetChannel: GuildBasedChannel,
        permissions: PermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnRole(
        member: GuildMember,
        targetRole: Role,
        permissions: PermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnUser(
        member: GuildMember,
        targetUser: User,
        permissions: PermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember,
        permissions: PermissionResolvable
    ): Awaitable<boolean>;
}

export default AbstractPermissionManager;
