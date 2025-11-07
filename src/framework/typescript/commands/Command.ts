import { APIInteractionGuildMember, type Awaitable, GuildMember, User } from "discord.js";
import CommandContextType from "./CommandContextType";
import type Context from "./Context";
import { CommandMode } from "./CommandMode";
import type { PermissionResolvable, RawPermissionResolvable } from "@framework/permissions/PermissionResolvable";
import Permission from "@framework/permissions/Permission";
import type Application from "@framework/app/Application";
import PermissionDeniedError from "@framework/permissions/PermissionDeniedError";

abstract class Command<C extends CommandContextType = CommandContextType> {
    /**
     * The name of this command.
     *
     * @type {string}
     */
    public abstract readonly name: string;

    /**
     * The group which this command belongs to.
     * This is automatically initialized by the command manager.
     */
    public readonly group: string = "Ungrouped";

    /**
     * Alias names of this command.
     */
    public readonly aliases: string[] = [];

    /**
     * List of supported contexts, where this command can run.
     *
     * @type {C[]}
     */
    public readonly contexts: C[] = [CommandContextType.Legacy, CommandContextType.Interactive] as C[];

    /**
     * List of supported modes, in which this command can run.
     *
     * @type {CommandMode[]}
     */
    public readonly modes: CommandMode[] = [CommandMode.Direct, CommandMode.Guild];

    /**
     * List of permissions required to run this command.
     *
     * @type {PermissionResolvable}
     */
    public readonly permissions: PermissionResolvable = [];

    /**
     * List of permissions *the system must have* to run this command.
     *
     * @type {PermissionResolvable}
     */
    public readonly systemPermissions: PermissionResolvable = [];

    /**
     * List of permissions the user must have to run this command,
     * regardless the current permission system being used.
     *
     * @type {PermissionResolvable}
     */
    public readonly permanentPermissions: PermissionResolvable = [];

    /**
     * Cached permissions.
     */
    private cachedPermissions: [RawPermissionResolvable, Permission[]] = [[], []];

    /**
     * Cached system permissions.
     */
    private cachedSystemPermissions: [RawPermissionResolvable, Permission[]] = [[], []];

    /**
     * Cached permanent permissions.
     */
    private cachedPermanentPermissions: [RawPermissionResolvable, Permission[]] = [[], []];

    /**
     * Whether the permissions have been cached.
     */
    private cachedPermissionsAreAvailable = false;

    /**
     * The application instance.
     */
    protected readonly application: Application;

    public constructor(application: Application) {
        this.application = application;
    }

    /**
     * Executes the command logic.
     *
     * @param context The command control context.
     * @param args Arguments passed to this command.
     * @param options Short and long (GNU style) options passed to this command.
     */
    protected abstract execute(
        context: Context,
        args: readonly unknown[],
        options: Readonly<Record<string, string>>
    ): Awaitable<void>;

    /**
     * Runs early during application boot.
     */
    public onAppBoot?(): Awaitable<void>;

    private cachePermissions(): void {
        if (this.cachedPermissionsAreAvailable) {
            return;
        }

        const permissions: [Set<RawPermissionResolvable>, Set<Permission>] = [new Set(), new Set()];
        const systemPermissions: [Set<RawPermissionResolvable>, Set<Permission>] = [new Set(), new Set()];
        const permanentPermissions: [Set<RawPermissionResolvable>, Set<Permission>] = [new Set(), new Set()];

        for (const permission of typeof this.permissions === "object" && Symbol.iterator in this.permissions
            ? this.permissions
            : [this.permissions]) {
            if (permission instanceof Permission) {
                permissions[1].add(permission);
                continue;
            }

            if (typeof permission === "function") {
                permissions[1].add(permission.getInstance(this.application));
                continue;
            }

            permissions[0].add(permission);
        }

        for (const permission of typeof this.systemPermissions === "object" && Symbol.iterator in this.systemPermissions
            ? this.systemPermissions
            : [this.systemPermissions]) {
            if (permission instanceof Permission) {
                systemPermissions[1].add(permission);
                continue;
            }

            if (typeof permission === "function") {
                permissions[1].add(permission.getInstance(this.application));
                continue;
            }

            systemPermissions[0].add(permission);
        }

        for (const permission of typeof this.permanentPermissions === "object" &&
        Symbol.iterator in this.permanentPermissions
            ? this.permanentPermissions
            : [this.permanentPermissions]) {
            if (permission instanceof Permission) {
                permanentPermissions[1].add(permission);
                continue;
            }

            if (typeof permission === "function") {
                permissions[1].add(permission.getInstance(this.application));
                continue;
            }

            permanentPermissions[0].add(permission);
        }

        this.cachedPermissions = [Array.from(permissions[0]) as RawPermissionResolvable, Array.from(permissions[1])];
        this.cachedSystemPermissions = [
            Array.from(systemPermissions[0]) as RawPermissionResolvable,
            Array.from(systemPermissions[1])
        ];
        this.cachedPermanentPermissions = [
            Array.from(permanentPermissions[0]) as RawPermissionResolvable,
            Array.from(permanentPermissions[1])
        ];
        this.cachedPermissionsAreAvailable = true;
    }

    private async cachedPermissionTest(
        member: GuildMember | APIInteractionGuildMember | User,
        cache: [RawPermissionResolvable, Permission[]]
    ) {
        if (member instanceof GuildMember && !member.permissions.has(cache[0], true)) {
            return cache[0];
        }

        for (const permission of cache[1]) {
            if (
                (member instanceof GuildMember && !(await permission.hasMember(member))) ||
                (member instanceof User && !(await permission.hasUser(member)))
            ) {
                return permission;
            }
        }

        return null;
    }

    private async checkPermissions(context: Context) {
        if (!this.cachedPermissionsAreAvailable) {
            this.cachePermissions();
        }

        const missingPermissions = await this.cachedPermissionTest(
            context.member || context.user,
            this.cachedPermissions
        );

        if (missingPermissions) {
            throw new PermissionDeniedError(missingPermissions);
        }
    }

    /**
     * Starts execution of this command.
     */
    public async run(context: Context): Promise<void> {
        try {
            await this.checkPermissions(context);
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                await context.error(error.message);
                return;
            } else {
                throw error;
            }
        }

        await this.execute(context, [], {});
    }
}

export default Command;
