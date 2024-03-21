import { GuildMember, PermissionFlagsBits, PermissionResolvable } from "discord.js";
import AbstractPermissionManager from "../framework/permissions/AbstractPermissionManager";
import { SystemPermissionResolvable } from "../framework/permissions/AbstractPermissionManagerService";
import { Permission } from "../framework/permissions/Permission";

class DiscordPermissionManager extends AbstractPermissionManager {
    public override async hasPermissions(
        member: GuildMember,
        permissions: SystemPermissionResolvable[]
    ): Promise<boolean> {
        const discordPermissions: PermissionResolvable[] = [];

        for (const permission of permissions) {
            if (
                (typeof permission === "string" && permission in PermissionFlagsBits) ||
                typeof permission === "bigint" ||
                typeof permission === "number"
            ) {
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
