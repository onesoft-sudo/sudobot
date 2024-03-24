import { GuildMember, PermissionResolvable } from "discord.js";
import FluentSet from "../framework/collections/FluentSet";
import AbstractPermissionManager, {
    MemberPermissionData
} from "../framework/permissions/AbstractPermissionManager";
import { SystemPermissionResolvable } from "../framework/permissions/AbstractPermissionManagerService";
import { Permission } from "../framework/permissions/Permission";

/**
 * A permission manager that uses Discord permissions to control access to resources.
 *
 * @since 9.0.0
 */
class DiscordPermissionManager extends AbstractPermissionManager {
    public override async getMemberPermissions(member: GuildMember): Promise<MemberPermissionData> {
        return {
            grantedDiscordPermissions: new FluentSet(member.permissions.toArray()),
            grantedSystemPermissions: (await Permission.of(member)).map(permission =>
                permission.getName()
            )
        };
    }

    public override async hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[],
        _alreadyComputedPermissions?: MemberPermissionData
    ): Promise<boolean> {
        const discordPermissions: PermissionResolvable[] = [];

        for (const permission of permissions) {
            if (Permission.isDiscordPermission(permission)) {
                discordPermissions.push(permission as PermissionResolvable);
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

        return member.permissions.has(discordPermissions, true);
    }
}

export default DiscordPermissionManager;