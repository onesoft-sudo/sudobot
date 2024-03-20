import { Awaitable, GuildMember, PermissionFlagsBits } from "discord.js";
import Client from "../../core/Client";
import { SystemPermissionResolvable } from "./AbstractPermissionManagerService";
import { Permission } from "./Permission";

abstract class AbstractPermissionManager {
    public constructor(protected readonly client: Client) {}

    public async hasPermissions(
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
                this.client.logger.warn(`Permission ${permission} does not exist.`);
                return false;
            }

            if (!(await instance.has(member))) {
                return false;
            }
        }

        return true;
    }

    public canBypassAutoModeration(member: GuildMember): Awaitable<boolean> {
        return this.hasPermissions(member, [PermissionFlagsBits.ManageGuild]);
    }

    public boot?(): Awaitable<void>;
}

export default AbstractPermissionManager;
