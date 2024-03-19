import { Awaitable, GuildMember, PermissionResolvable } from "discord.js";

abstract class Permission {
    /**
     * The name of the permission.
     */
    protected abstract readonly name: string;

    /**
     * The equivalent Discord permissions.
     */
    protected readonly equivalentDiscordPermissions?: PermissionResolvable[];

    /**
     * The stringified representation of the object.
     *
     * @returns The name of the permission.
     */
    public toString(): string {
        return this.name;
    }

    public toDiscordPermissions(): PermissionResolvable[] {
        return this.equivalentDiscordPermissions ?? [];
    }

    public async has(member: GuildMember) {
        if (this.equivalentDiscordPermissions !== undefined) {
            return member.permissions.has(this.equivalentDiscordPermissions, true);
        }

        return !!(await this.validate?.(member));
    }

    public canConvertToDiscordPermissions(): boolean {
        return this.equivalentDiscordPermissions !== undefined;
    }

    protected validate?(member: GuildMember): Awaitable<boolean>;
}

export type PermissionLike = Permission | PermissionResolvable;
export { Permission };
