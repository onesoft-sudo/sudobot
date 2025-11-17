import type { APIInteractionGuildMember, Awaitable, GuildBasedChannel, PermissionResolvable, Role } from "discord.js";
import { PermissionsBitField, User } from "discord.js";
import type { GuildMember } from "discord.js";
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

    public abstract hasPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        permissions?: RawPermissionResolvable,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<boolean>;

    public getPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Awaitable<GetPermissionsResult>;
    public async getPermissions(
        user: GuildMember | APIInteractionGuildMember | User,
        systemPermissions?: Iterable<SystemPermissionResolvable>
    ): Promise<GetPermissionsResult> {
        if (!systemPermissions) {
            return {
                customPermissions: [],
                discordPermissions:
                    user instanceof User
                        ? 0n
                        : typeof user.permissions === "string"
                          ? new PermissionsBitField(user.permissions as PermissionResolvable).bitfield
                          : user.permissions.bitfield,
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
            discordPermissions:
                user instanceof User
                    ? 0n
                    : typeof user.permissions === "string"
                      ? new PermissionsBitField(user.permissions as PermissionResolvable).bitfield
                      : user.permissions.bitfield,
            grantAll: false
        };
    }

    protected async customPermissionCheck(
        systemPermissions: Iterable<SystemPermissionResolvable>,
        user: GuildMember | APIInteractionGuildMember | User
    ) {
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
        member: GuildMember | APIInteractionGuildMember,
        targetChannel: GuildBasedChannel
    ): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnRole(
        member: GuildMember | APIInteractionGuildMember,
        targetRole: Role
    ): Awaitable<GetPermissionsResult>;
    public abstract getPermissionsOnMember(
        member: GuildMember | APIInteractionGuildMember,
        targetMember: GuildMember | APIInteractionGuildMember
    ): Awaitable<GetPermissionsResult>;

    public abstract hasPermissionsOnChannel(
        member: GuildMember | APIInteractionGuildMember,
        targetChannel: GuildBasedChannel,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnRole(
        member: GuildMember | APIInteractionGuildMember,
        targetRole: Role,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
    public abstract hasPermissionsOnMember(
        member: GuildMember | APIInteractionGuildMember,
        targetMember: GuildMember | APIInteractionGuildMember,
        permissions: RawPermissionResolvable
    ): Awaitable<boolean>;
}

export default AbstractPermissionManager;
