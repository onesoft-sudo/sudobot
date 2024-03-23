import { Awaitable, GuildMember, PermissionFlagsBits, PermissionResolvable } from "discord.js";
import Application from "../app/Application";
import FluentSet from "../collections/FluentSet";
import {
    SystemPermissionLikeString,
    SystemPermissionResolvable
} from "./AbstractPermissionManagerService";
import { Permission } from "./Permission";

abstract class AbstractPermissionManager {
    public constructor(protected readonly application: Application) {}

    public async hasDiscordPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[]
    ): Promise<boolean> {
        for (const permission of permissions) {
            if (Permission.isDiscordPermission(permission)) {
                if (!member.permissions.has(permission, true)) {
                    return false;
                }

                continue;
            }

            const instance = await Permission.resolve(permission);

            if (!instance) {
                this.application.logger.warn(`Permission ${permission} does not exist.`);
                return false;
            }

            if (!(await instance.has(member))) {
                return false;
            }
        }

        return true;
    }

    public async hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[],
        alreadyComputedPermissions?: MemberPermissionData
    ): Promise<boolean> {
        const { grantedDiscordPermissions, grantedSystemPermissions } =
            alreadyComputedPermissions ?? (await this.getMemberPermissions(member));

        for (const permission of permissions) {
            const instance: PermissionResolvable | Permission | undefined =
                typeof permission === "function"
                    ? await permission.getInstance<Permission>()
                    : typeof permission === "string"
                    ? Permission.fromString(permission)
                    : permission;

            if (!instance) {
                this.application.logger.debug(`Permission ${permission} does not exist`);
                continue;
            }

            if (Permission.isDiscordPermission(instance)) {
                if (
                    !grantedDiscordPermissions.has(instance) &&
                    !member.permissions.has(instance, true)
                ) {
                    return false;
                }

                continue;
            }

            if (
                !grantedSystemPermissions.has(instance.getName()) &&
                !(await instance.has(member))
            ) {
                return false;
            }
        }

        return true;
    }

    public canBypassAutoModeration(member: GuildMember): Awaitable<boolean> {
        return this.hasPermissions(member, [PermissionFlagsBits.ManageGuild]);
    }

    public boot?(): Awaitable<void>;
    public abstract getMemberPermissions(member: GuildMember): Awaitable<MemberPermissionData>;
}

export type MemberPermissionData = {
    grantedDiscordPermissions: FluentSet<PermissionResolvable>;
    grantedSystemPermissions: FluentSet<SystemPermissionLikeString>;
};

export default AbstractPermissionManager;
