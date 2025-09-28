/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { ApplicationCommandType } from "@framework/discord/ApplicationCommandType";
import type { Logger } from "@framework/log/Logger";
import type {
    Awaitable,
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
    Message,
    PermissionsString,
    SlashCommandOptionsOnlyBuilder,
    Snowflake,
    User
} from "discord.js";
import { ContextMenuCommandBuilder, InteractionContextType, SlashCommandBuilder } from "discord.js";
import type Application from "../app/Application";
import type Argument from "../arguments/Argument";
import type ArgumentParser from "../arguments/ArgumentParser";
import type { CommandManagerServiceInterface } from "../contracts/CommandManagerServiceInterface";
import type { ConfigurationManagerServiceInterface } from "../contracts/ConfigurationManagerServiceInterface";
import type { MemberPermissionData } from "../contracts/PermissionManagerInterface";
import type { PermissionManagerServiceInterface } from "../contracts/PermissionManagerServiceInterface";
import type { Guard } from "../guards/Guard";
import type { GuardLike } from "../guards/GuardLike";
import type { SystemOnlyPermissionResolvable } from "../permissions/AbstractPermissionManagerService";
import type { PermissionLike } from "../permissions/Permission";
import { Permission } from "../permissions/Permission";
import { PermissionDeniedError } from "../permissions/PermissionDeniedError";
import type { Policy } from "../policies/Policy";
import type Builder from "../types/Builder";
import CommandAbortedError from "./CommandAbortedError";
import type { ContextOf } from "./Context";
import Context from "./Context";
import { ContextType } from "./ContextType";
import type InteractionContext from "./InteractionContext";
import type LegacyContext from "./LegacyContext";

export type CommandMessage = Message<true> | ChatInputCommandInteraction | ContextMenuCommandInteraction;
export type ChatContext = LegacyContext | InteractionContext<ChatInputCommandInteraction>;
export type CommandBuilders = Array<Buildable>;
export type AnyCommand = Command<ContextType>;

export type SubcommandMeta = {
    description: string;
    detailedDescription?: string;
    aliases?: string[];
    supportedContexts?: ContextType[];
    usage?: string[];
    deprecated?: boolean;
    options?: Record<string, string>;
    beta?: boolean;
    systemAdminOnly?: boolean;
    since?: string;
    permissionCheckingMode?: "or" | "and";
    permissions?: PermissionsString[];
    systemPermissions?: PermissionsString[];
    persistentDiscordPermissions?: PermissionsString[];
    persistentCustomPermissions?: SystemOnlyPermissionResolvable[];
};

export type CommandGuardLike = GuardLike | typeof Guard;
export type CommandPermissionLike = PermissionLike | PermissionsString | typeof Permission;
export type PlainPermissionResolvable = PermissionsString | bigint;

abstract class Command<T extends ContextType = ContextType.ChatInput | ContextType.Legacy>
    implements Builder<CommandBuilders>
{
    public abstract readonly name: string;

    public group!: string;

    public abstract readonly description: string;

    public readonly detailedDescription?: string;

    public readonly aliases: string[] = [];

    /**
     * The supported contexts of the command.
     */
    public readonly supportedContexts: readonly T[] = [ContextType.Legacy, ContextType.ChatInput] as T[];

    /**
     * Whether the command should be deferred.
     */
    public readonly defer: boolean = false;

    /**
     * Whether the command should be ephemeral.
     */
    public readonly ephemeral: boolean = false;

    /**
     * Options for the command. The keys are the options without dashes at the beginning, and
     * the values are the description of the option.
     */
    public readonly options: Record<string, string> = {};

    /**
     * The subcommands of the command.
     */
    public readonly subcommands: string[] = [];

    /**
     * Whether the subcommands of the command are isolated in their own file.
     */
    public readonly isolatedSubcommands: boolean = false;

    /**
     * The metadata for the subcommands of the command.
     */
    public readonly subcommandMeta: Record<string, SubcommandMeta> = {};

    /**
     * The version of the bot when this command was introduced.
     */
    public readonly since: string = "1.0.0";

    /**
     * Whether the command is in beta.
     */
    public readonly beta: boolean = false;

    /**
     * Whether the command is deprecated.
     */
    public readonly deprecated: boolean = false;

    /**
     * The cooldown of the command in milliseconds.
     */
    public readonly cooldown?: number;

    /**
     * The maximum number of attempts for the command, during the cooldown period.
     */
    public readonly maxAttempts: number = 1;

    /**
     * Whether the command is disabled.
     */
    public readonly disabled: boolean = false;

    /**
     * The required permissions for the member running this command.
     * Can be modified or removed by the permission manager.
     */
    public readonly permissions?: CommandPermissionLike[];

    /**
     * The mode for checking permissions.
     */
    public readonly permissionCheckingMode: "or" | "and" = "and";

    /**
     * The persistent discord permissions for the member running this command.
     *
     * These permissions are not affected by the permission manager.
     */
    public readonly persistentDiscordPermissions?: PermissionsString[];

    /**
     * The persistent custom permissions for the member running this command.
     *
     * These permissions are not affected by the permission manager.
     */
    public readonly persistentCustomPermissions?: SystemOnlyPermissionResolvable[];

    /**
     * The cached persistent custom permissions of this command. For internal use only.
     */
    private cachedPersistentCustomPermissions?: Permission[];

    /**
     * The required permissions for the bot system to run this command.
     */
    public readonly systemPermissions?: PlainPermissionResolvable[];

    /**
     * Whether the command can only be run by system admins.
     */
    public readonly systemAdminOnly: boolean = false;

    /**
     * The usage(s) of the command.
     */
    public readonly usage: string[] = [];

    /**
     * The permission guards for the command.
     */
    public readonly guards: CommandGuardLike[] = [];

    /**
     * The argument parser for the command.
     */
    private readonly argumentParser: ArgumentParser;

    /**
     * The permission manager service.
     */
    private readonly internalPermissionManager: PermissionManagerServiceInterface;

    /**
     * Whether this command has been initialized.
     */
    private _initialized = false;

    /**
     * The file associated with the command.
     */
    private _file?: string;

    /**
     * The logger for the command.
     */
    protected readonly logger: Logger;

    /**
     * Creates a new instance of the Command class.
     *
     * @param application - The client instance.
     */
    public constructor(protected readonly application: Application) {
        this.argumentParser = (
            application.service("commandManager") satisfies CommandManagerServiceInterface
        ).getArgumentParser();
        this.internalPermissionManager = application.service(
            "permissionManager"
        ) satisfies PermissionManagerServiceInterface;
        this.logger = application.logger;
    }

    /**
     * A wrapper for the _initialized private property.
     */
    public get initialized() {
        return this._initialized;
    }

    /**
     * A wrapper for the _file private property.
     */
    public get file() {
        return this._file;
    }

    /**
     * Initializes the command.
     * This method gets called when the command is loaded.
     *
     * @returns - Nothing, or a promise that resolves when the command is initialized.
     */
    public initialize?(): Awaitable<void>;

    /**
     * Sets the file associated with the command.
     *
     * @param file - The path to the file associated with the command.
     */
    public setFile(file: string) {
        this._file = file;
    }

    /**
     * Checks if the command supports legacy context.
     *
     * @returns True if the command supports legacy context, false otherwise.
     */
    public supportsLegacy(): this is Command<ContextType.Legacy> {
        return this.supportedContexts.includes(ContextType.Legacy as T);
    }

    /**
     * Checks if the command supports chat input context.
     *
     * @returns True if the command supports chat input context, false otherwise.
     */
    public supportsChatInput(): this is Command<ContextType.ChatInput> {
        return this.supportedContexts.includes(ContextType.ChatInput as T);
    }

    /**
     * Checks if the command supports message context menu.
     *
     * @returns True if the command supports message context menu, false otherwise.
     */
    public supportsMessageContextMenu(): this is Command<ContextType.MessageContextMenu> {
        return this.supportedContexts.includes(ContextType.MessageContextMenu as T);
    }

    /**
     * Checks if the command supports user context menu.
     *
     * @returns True if the command supports user context menu, false otherwise.
     */
    public supportsUserContextMenu(): this is Command<ContextType.UserContextMenu> {
        return this.supportedContexts.includes(ContextType.UserContextMenu as T);
    }

    /**
     * Checks if the command supports any context menu.
     *
     * @returns True if the command supports any context menu, false otherwise.
     */
    public supportsContextMenu(): this is Command<ContextType.MessageContextMenu | ContextType.UserContextMenu> {
        return this.supportsMessageContextMenu() || this.supportsUserContextMenu();
    }

    public supportsInteraction(): this is Command<
        ContextType.MessageContextMenu | ContextType.UserContextMenu | ContextType.ChatInput
    > {
        return this.supportsChatInput() || this.supportsContextMenu();
    }

    public isDisabled(guildId?: Snowflake): boolean {
        const configManager = this.application.service("configManager") as ConfigurationManagerServiceInterface;
        const name = this.name.replace("::", " ");

        return (
            this.disabled ||
            (configManager.systemConfig.commands.global_disabled as string[]).includes(name) ||
            !!(guildId && (configManager.config[guildId]?.commands?.disabled_commands as string[])?.includes(name))
        );
    }

    /**
     * Builds the chat input command.
     *
     * @returns The chat input command builder.
     */
    protected buildChatInput() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setContexts(InteractionContextType.Guild);
    }

    /**
     * Builds the context menu command.
     *
     * @returns The context menu command builder.
     */
    protected buildContextMenu() {
        return new ContextMenuCommandBuilder().setName(this.name).setContexts(InteractionContextType.Guild);
    }

    /**
     * Builds the command data.
     *
     * @returns An array of command builders.
     */
    public build(): Buildable[] {
        const data: Array<SlashCommandBuilder | ContextMenuCommandBuilder> = [];

        if (this.supportsMessageContextMenu()) {
            data.push(
                new ContextMenuCommandBuilder()
                    .setName(this.name)
                    .setContexts(InteractionContextType.Guild)
                    .setType(ApplicationCommandType.Message)
            );
        }

        if (this.supportsUserContextMenu()) {
            data.push(
                new ContextMenuCommandBuilder()
                    .setName(this.name)
                    .setContexts(InteractionContextType.Guild)
                    .setType(ApplicationCommandType.User)
            );
        }

        if (this.supportsChatInput()) {
            data.push(this.buildChatInput());
        }

        return data;
    }

    /**
     * Executes the actual command logic.
     *
     * @param context - The command context.
     * @param args - The command arguments.
     */
    public abstract execute(
        context: Context,
        args?: Record<string, unknown>,
        options?: Record<string, unknown>
    ): Awaitable<void>;

    /**
     * Handles the case when a subcommand is not found.
     *
     * @param context - The command context.
     * @param subcommand - The subcommand that was not found.
     * @param errorType - The type of error that occurred.
     */
    public onSubcommandNotFound?(
        context: Context,
        subcommand: string,
        errorType: "not_found" | "not_specified"
    ): Promise<void>;

    /**
     * Runs the preconditions of the command.
     *
     * @param context - The command context.
     * @returns The result of the precondition check.
     */
    public async runPreconditions(context: Context): Promise<PreconditionExecutionResult> {
        const state: CommandExecutionState<false> = {
            memberPermissions: undefined,
            isSystemAdmin: undefined
        };

        if (!(await this.checkPreconditions(context, state))) {
            return {
                passed: false,
                state: state as CommandExecutionState<boolean>
            };
        }

        return {
            passed: true,
            state: state as CommandExecutionState<boolean>
        };
    }

    /**
     * Prepares and begins to execute the command.
     *
     * @param context - The command context.
     * @param rootCommand - The root command.
     */
    public async run(context: Context, rootCommand?: Command) {
        const state: CommandExecutionState<false> = {
            memberPermissions: undefined,
            isSystemAdmin: undefined
        };

        if (!(await this.checkPreconditions(context, state))) {
            return;
        }

        if (!state.isSystemAdmin) {
            const ratelimiter = (
                this.application.service("commandManager") as CommandManagerServiceInterface
            ).getRateLimiter();

            if (await ratelimiter.isRateLimitedWithHit(this.name, context.guildId, context.userId)) {
                await context.error("You're being rate limited. Please try again later.");
                return;
            }
        }

        if (this.defer) {
            await context.defer({ ephemeral: this.ephemeral });
        }

        if (context.isLegacy() || context.isChatInput()) {
            const { error, value, abort } = await this.argumentParser.parse({
                command: rootCommand ?? (this as Command),
                context,
                parseSubCommand: !!rootCommand
            });

            if (abort) {
                return;
            }

            if (error) {
                await context.error(error);
                return;
            }

            await this.execute(context, value?.parsedArgs ?? {}, value?.parsedOptions ?? {});
        } else {
            await this.execute(context);
        }
    }

    /**
     * Aborts the execution of a command.
     *
     * @throws CommandAbortedError
     * @param reason The reason for aborting
     */
    protected abort(reason?: string): never {
        throw new CommandAbortedError(reason);
    }

    /**
     * Checks if this command has subcommands.
     *
     * @returns True if the command has subcommands, false otherwise.
     */
    public get hasSubcommands() {
        return this.subcommands.length > 0;
    }

    private isInDisabledChannel(guildId: Snowflake, channelId: Snowflake) {
        const configManager = this.application.service("configManager") satisfies ConfigurationManagerServiceInterface;

        const channels = configManager.config[guildId]?.commands?.channels;

        return channels?.mode === "include"
            ? !channels.list.includes(channelId)
            : channels?.mode === "exclude"
              ? channels.list.includes(channelId)
              : false;
    }

    /**
     * Checks the preconditions of the command.
     *
     * @param context - The command context.
     * @param state
     * @returns {Promise<boolean>} True if the preconditions are met, false otherwise.
     */
    protected async checkPreconditions(context: Context, state: CommandExecutionState<false>): Promise<boolean> {
        if (this.isDisabled(context.guildId)) {
            await context.error("This command is disabled.");
            return false;
        }

        if (this.isInDisabledChannel(context.guildId, context.channelId)) {
            await context.error("This command is disabled in this channel.");
            return false;
        }

        if (!context.member) {
            return false;
        }

        state.memberPermissions = await this.internalPermissionManager.getMemberPermissions(context.member);

        const isSystemAdmin = await this.internalPermissionManager.isSystemAdmin(
            context.member,
            state.memberPermissions
        );

        state.isSystemAdmin = isSystemAdmin;
        this.application.logger.debug("Member permissions: ", state.memberPermissions);

        if (isSystemAdmin) {
            return true;
        }

        if (!isSystemAdmin && this.systemAdminOnly) {
            throw new PermissionDeniedError("This command can only be used by system administrators.");
        }

        try {
            if (
                !(await this.checkPermissions(context, state as unknown as CommandExecutionState<true>)) &&
                (await this.checkGuards(context))
            ) {
                throw new PermissionDeniedError("You don't have permission to run this command.");
            }
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                context.error(error.message).catch(this.application.logger.error);
                return false;
            }

            throw error;
        }

        return true;
    }

    protected async computePersistentPermissions() {
        if (!this.persistentCustomPermissions) {
            return;
        }

        this.application.logger.debug("Computing persistent permissions for command: ", this.name);
        this.cachedPersistentCustomPermissions = [];

        for (const permission of this.persistentCustomPermissions) {
            const instance =
                typeof permission === "string"
                    ? this.internalPermissionManager.getPermissionByName(permission)
                    : typeof permission === "function"
                      ? await permission.getInstance<Permission>()
                      : permission;

            if (!instance) {
                this.application.logger.debug(`Invalid permission: ${permission?.toString()}: Not found`);
                continue;
            }

            this.cachedPersistentCustomPermissions.push(instance);
        }
    }

    /**
     * Checks the permissions of the command.
     *
     * @param context - The command context.
     * @param state
     * @returns True if the permissions are met, false otherwise.
     */
    protected async checkPermissions(context: Context, state: CommandExecutionState<true>) {
        const permissionManager = this.internalPermissionManager;

        if (this.systemPermissions) {
            const me = context.guild.members.me ?? (await context.guild.members.fetchMe());

            if (!me.permissions.has(this.systemPermissions, true)) {
                throw new PermissionDeniedError("The system is missing permissions to perform this action.");
            }
        }

        if (!context.member) {
            return false;
        }

        if (this.persistentCustomPermissions) {
            if (!this.cachedPersistentCustomPermissions) {
                await this.computePersistentPermissions();
            }
        }

        if (this.persistentDiscordPermissions) {
            if (
                this.permissionCheckingMode === "and" &&
                !context.member.permissions.has(this.persistentDiscordPermissions, true)
            ) {
                return false;
            }

            if (
                this.permissionCheckingMode === "or" &&
                !context.member.permissions.any(this.persistentDiscordPermissions, true)
            ) {
                return false;
            }
        }

        if (this.cachedPersistentCustomPermissions) {
            for (const permission of this.cachedPersistentCustomPermissions) {
                if (!(await permission.has(context.member))) {
                    return false;
                }
            }
        }

        const configManager = this.application.service("configManager") satisfies ConfigurationManagerServiceInterface;
        const mode =
            configManager.config[context.guildId]?.permissions?.command_permission_mode ??
            configManager.systemConfig.command_permission_mode;

        const commandManager = this.application.service("commandManager") satisfies CommandManagerServiceInterface;

        const result = await commandManager.checkCommandPermissionOverwrites(
            context,
            this.name,
            state.memberPermissions
        );

        if (!result?.allow) {
            throw new PermissionDeniedError("You don't have enough permissions to run this command.");
        }

        const { overwrite } = result;

        if (((!overwrite && mode === "overwrite") || mode === "check") && this.permissions) {
            if (this.permissionCheckingMode === "and") {
                return await permissionManager.hasPermissions(
                    context.member,
                    this.permissions,
                    state.memberPermissions
                );
            } else
                block: {
                    for (const permission of this.permissions) {
                        if (
                            Permission.isDiscordPermission(permission) &&
                            !context.member.permissions.has(permission, true)
                        ) {
                            continue;
                        }

                        if (
                            !(await permissionManager.hasPermissions(
                                context.member,
                                [permission],
                                state.memberPermissions
                            ))
                        ) {
                            continue;
                        }

                        break block;
                    }

                    return false;
                }
        }

        return true;
    }

    /**
     * Checks the guards of the command.
     *
     * @param context - The command context.
     * @returns {Promise<boolean>} True if the guards are met, false otherwise.
     */
    protected async checkGuards(context: Context): Promise<boolean> {
        for (const guard of this.guards) {
            const instance = typeof guard === "function" ? await guard.getInstance() : guard;

            if (!(await instance.check(this, context as ContextOf<this>))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Attempts to authorize the user to perform an action.
     *
     * @param options - The options for the authorization.
     * @param contextOrUser - The context or user to authorize.
     * @returns True if the user is authorized, false otherwise.
     * @throws {PermissionDeniedError} If the user is not authorized.
     */
    protected async authorize<K extends Exclude<keyof PolicyActions, number>>(
        contextOrUser: Context | User,
        options: AuthorizeOptions<K>
    ) {
        const { action, args, policy, errorMessage, onFail } = options;
        const result = await policy.can(
            action,
            contextOrUser instanceof Context ? contextOrUser.user : contextOrUser,
            ...args
        );

        if (!result) {
            if (onFail) {
                await onFail();
                return false;
            }

            throw new PermissionDeniedError(errorMessage ?? "You're missing permissions to perform this action.");
        }

        return result;
    }
}

export type AuthorizeOptions<K extends Exclude<keyof PolicyActions, number>> = {
    policy: typeof Policy;
    action: K;
    args: PolicyActions[K];
    onFail?: () => Awaitable<void>;
    errorMessage?: string;
};

export type Arguments = Record<string | number, unknown>;
export type ArgumentPayload<N extends boolean = false> =
    | Array<Argument<unknown> | null | (N extends true ? undefined : never)>
    | [Arguments | (N extends true ? undefined : never)];
export type CommandExecutionState<L extends boolean = false> = {
    memberPermissions: MemberPermissionData | (L extends false ? undefined : never);
    isSystemAdmin: boolean | (L extends false ? undefined : never);
};
export type Buildable = Pick<
    SlashCommandBuilder | ContextMenuCommandBuilder | SlashCommandOptionsOnlyBuilder,
    "name" | "toJSON"
>;
export type PreconditionExecutionResult = {
    passed: boolean;
    state: CommandExecutionState<boolean>;
};

export { Command };
