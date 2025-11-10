/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import type { APIInteractionGuildMember } from "discord.js";
import { type Awaitable, GuildMember, inlineCode, User } from "discord.js";
import CommandContextType from "./CommandContextType";
import type Context from "./Context";
import { CommandMode } from "./CommandMode";
import type { PermissionResolvable, RawPermissionResolvable } from "@framework/permissions/PermissionResolvable";
import Permission from "@framework/permissions/Permission";
import type Application from "@framework/app/Application";
import PermissionDeniedError from "@framework/permissions/PermissionDeniedError";
import type { GuardResolvable } from "@framework/guards/GuardResolvable";
import Guard from "@framework/guards/Guard";
import CommandAbortedError from "./CommandAbortedError";
import ArgumentParser from "@framework/arguments/ArgumentParser";
import { Memoize } from "@framework/decorators/Memoize";
import { ArgumentSchema } from "@framework/arguments/ArgumentSchema";
import LegacyContext from "./LegacyContext";
import InteractionContext from "./InteractionContext";

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
    public readonly group: string = "";

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
     * Protector guards for this command.
     *
     * @type {Iterable<GuardResolvable>}
     */
    public readonly guards: Iterable<GuardResolvable> = [];

    /**
     * Argument schema for this command.
     *
     * @type {ArgumentSchema}
     */
    public readonly argumentSchema?: ArgumentSchema;

    /**
     * The application instance.
     */
    protected readonly application: Application;

    /**
     * The argument parser instance.
     */
    protected readonly argumentParser: ArgumentParser;

    public constructor(application: Application) {
        this.application = application;
        this.argumentParser = this.createArgumentParser();
    }

    /**
     * Creates an argument parser instance.
     *
     * @returns Memoized argument parser instance.
     */
    @Memoize
    protected createArgumentParser() {
        return new ArgumentParser(this.application);
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
        args: Readonly<Record<string, unknown>>,
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
        const permissionArray =
            typeof this.permissions === "object" && Symbol.iterator in this.permissions
                ? this.permissions
                : [this.permissions];
        const systemPermissionArray =
            typeof this.systemPermissions === "object" && Symbol.iterator in this.systemPermissions
                ? this.systemPermissions
                : [this.systemPermissions];
        const permanentPermissionArray =
            typeof this.permanentPermissions === "object" && Symbol.iterator in this.permanentPermissions
                ? this.permanentPermissions
                : [this.permanentPermissions];

        for (const permission of permissionArray) {
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

        for (const permission of systemPermissionArray) {
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

        for (const permission of permanentPermissionArray) {
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

        if (member instanceof User && (Array.isArray(cache[0]) ? cache[0].length > 0 : cache[0])) {
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

        const missingPermanentPermissions = await this.cachedPermissionTest(
            context.member || context.user,
            this.cachedPermanentPermissions
        );

        if (missingPermissions || missingPermanentPermissions) {
            throw new PermissionDeniedError((missingPermissions || missingPermanentPermissions)!);
        }

        const systemPermissions = await this.cachedPermissionTest(
            context.member || context.user,
            this.cachedSystemPermissions
        );

        if (systemPermissions) {
            throw new PermissionDeniedError(
                systemPermissions,
                "The system is missing permissions to perform this action."
            );
        }
    }

    private async checkGuards(context: Context): Promise<void> {
        const failedGuard = await Guard.runGuards(this, context, this.guards);

        if (failedGuard) {
            throw new PermissionDeniedError([], "You aren't permitted to use this command.");
        }
    }

    private checkPreconditions(context: Context): Awaitable<void> {
        const requiredMode = context.inGuild() ? CommandMode.Guild : CommandMode.Direct;

        if (!this.modes.includes(requiredMode)) {
            throw new CommandAbortedError(
                this,
                `This command does not support **${requiredMode === CommandMode.Guild ? "server" : "direct message"}** mode.`
            );
        }
    }

    /**
     * Starts execution of this command.
     */
    public async run(context: Context): Promise<void> {
        try {
            await this.checkPreconditions(context);
            await this.checkPermissions(context);
            await this.checkGuards(context);
        } catch (error) {
            if (error instanceof PermissionDeniedError || error instanceof CommandAbortedError) {
                context.error(error.message).catch(this.application.logger.error);
                return;
            } else {
                throw error;
            }
        }

        const result = this.argumentSchema
            ? await this.argumentParser.parse(context as LegacyContext | InteractionContext, this.argumentSchema)
            : undefined;

        if (result?.errors?.length) {
            if (result.errors.length === 1 || !this.argumentSchema) {
                context.error(result?.errors[0]).catch(this.application.logger.error);
            } else {
                let str = "No overloads of this command could be used with the given arguments:\n";

                for (let i = 0; i < result.errors.length; i++) {
                    str += `\n${i + 1}. ${inlineCode(this.argumentParser.overloadSignatureToString(this.argumentSchema.overloads[i]))} gave the following error:\n  ${result.errors[i]}`;
                }

                context.error(str).catch(this.application.logger.error);
            }

            return;
        }

        await this.execute(context, result?.args || {}, {});
    }
}

export default Command;
