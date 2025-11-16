import type { Awaitable, GuildBasedChannel, Role, User } from "discord.js";
import { GuildMember } from "discord.js";
import type { RawPermissionResolvable, SystemPermissionResolvable } from "./PermissionResolvable";
import Permission from "./Permission";
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

    public abstract hasPermissions(user: GuildMember | User, permissions?: RawPermissionResolvable, systemPermissions?: Iterable<SystemPermissionResolvable>): Awaitable<boolean>;

    public getPermissions(
        user: GuildMember | User,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<GetPermissionsResult>;
    public async getPermissions(
        user: GuildMember | User,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<GetPermissionsResult> {
        if (!systemPermissions) {
            return {
                customPermissions: [],
                discordPermissions: user instanceof GuildMember ? user.permissions.bitfield : 0n,
                grantAll: false
            };
        }

        const customPermissions = [];

        for (const permission of systemPermissions) {
            const instance = Permission.resolve(this.application, permission);

            if (!(await instance.has(user))) {
                continue;
            }

            customPermissions.push(instance);
        }

        return {
            customPermissions,
            discordPermissions: user instanceof GuildMember ? user.permissions.bitfield : 0n,
            grantAll: false
        };
    }

    protected async customPermissionCheck(systemPermissions: Iterable<SystemPermissionResolvable>, user: GuildMember | User) {
        const customPermissions = [];

        for (const permission of systemPermissions) {
            const instance = Permission.resolve(this.application, permission);

            if (!(await instance.has(user))) {
                continue;
            }

            customPermissions.push(instance);
        }

        return customPermissions;
    }

    public abstract getPermissionsOnChannel(
        member: GuildMember,
        targetChannel: GuildBasedChannel
    ): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnRole(member: GuildMember, targetRole: Role): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember
    ): Awaitable<GetPermissionsResult>;

    public abstract hasPermissionsOnChannel(
        member: GuildMember,
        targetChannel: GuildBasedChannel,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnRole(
        member: GuildMember,
        targetRole: Role,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnMember(
        member: GuildMember,
        targetMember: GuildMember,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
}

export default AbstractPermissionManager;
