/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import { CommandPermissionOverwrite, CommandPermissionOverwriteAction } from "@prisma/client";
import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    Collection,
    CommandInteraction,
    ContextMenuCommandInteraction,
    Message,
    PermissionResolvable,
    PermissionsBitField,
    PermissionsString,
    Snowflake
} from "discord.js";
import { Command } from "../framework/commands/Command";
import CommandAbortedError from "../framework/commands/CommandAbortedError";
import Context from "../framework/commands/Context";
import InteractionContext from "../framework/commands/InteractionContext";
import LegacyContext from "../framework/commands/LegacyContext";
import { Inject } from "../framework/container/Inject";
import { MemberPermissionData } from "../framework/permissions/AbstractPermissionManager";
import { SystemPermissionLikeString } from "../framework/permissions/AbstractPermissionManagerService";
import { Name } from "../framework/services/Name";
import { Service } from "../framework/services/Service";
import LevelBasedPermissionManager from "../security/LevelBasedPermissionManager";
import { developmentMode, pick } from "../utils/utils";
import type ConfigurationManager from "./ConfigurationManager";
import { ContextType } from "../framework/commands/ContextType";

type MinimalCommandPermissionOverwrite = Pick<
    CommandPermissionOverwrite,
    | "requiredChannels"
    | "requiredRoles"
    | "requiredLevel"
    | "requiredDiscordPermissions"
    | "requiredSystemPermissions"
    | "requiredUsers"
>;

type CommandOverwriteLogic<T> = {
    and?: T[];
    deepAnd?: T[][];
};

type CachedMinimalCommandPermissionOverwrite = {
    requiredChannels: Snowflake[] | null;
    requiredRoles: CommandOverwriteLogic<Snowflake> | null;
    requiredLevel: number | null;
    requiredPermissions: CommandOverwriteLogic<PermissionsString> | null;
    requiredSystemPermissions: CommandOverwriteLogic<SystemPermissionLikeString> | null;
    requiredUsers: CommandOverwriteLogic<Snowflake> | null;
};

type CachedCommandPermissionOverwrites = {
    allow: CachedMinimalCommandPermissionOverwrite | null;
    deny: CachedMinimalCommandPermissionOverwrite | null;
};

@Name("commandManager")
class CommandManager extends Service {
    public readonly commands = new Collection<string, Command>();
    public readonly permissionOverwrites = new Collection<
        `${Snowflake}:${string}`,
        CachedCommandPermissionOverwrites
    >();

    @Inject("configManager")
    protected readonly configManager!: ConfigurationManager;

    public async onReady() {
        await this.loadCommandPermissionOverwrites();
        await this.registerApplicationCommands();
    }

    public async registerApplicationCommands() {
        const existingApplicationCommands = await this.client.application?.commands.fetch();

        if (existingApplicationCommands?.size && !developmentMode()) {
            this.application.logger.debug(
                "Skipped registering application commands as they're already registered"
            );
            return;
        }

        const mode = this.configManager.systemConfig.commands.register_application_commands_on_boot;

        if (mode === "none") {
            this.application.logger.debug(
                "Skipped registering application commands as it's disabled"
            );

            return;
        }

        const commands = this.commands
            .filter((command, key) => !command.name.includes("::") && command.name === key && command.supportsInteraction())
            .map(command => command.build().map(builder => builder.toJSON()))
            .flat();

        if (!commands.length) {
            this.application.logger.debug("No commands to register");
            return;
        }

        const guildId = mode === "guild" ? process.env.HOME_GUILD_ID : undefined;
        let registered = false;

        if (guildId) {
            await this.client.application?.commands.set(commands, guildId);
            registered = true;
        } else if (mode === "always_global") {
            await this.client.application?.commands.set(commands);
            this.application.logger.debug("Registering global commands on every startup is not recommended, as you may hit the global rate limit.");
            this.application.logger.debug("Please consider using guild commands instead, for testing purposes.");
            registered = true;
        } else if (
            mode === "auto_global" &&
            (process.argv.includes("--update-commands") || process.argv.includes("-u"))
        ) {
            await this.client.application?.commands.set(commands);
            registered = true;
        }

        if (registered) {
            this.application.logger.info(
                `Registered ${commands.length} application ${guildId ? "guild " : ""}commands`
            );
        }
    }

    public async loadCommandPermissionOverwrites() {
        const permissionOverwrites =
            await this.application.prisma.commandPermissionOverwrite.findMany({
                where: { disabled: false }
            });

        for (const overwrite of permissionOverwrites) {
            const cache = this.makeCache(overwrite);

            for (const command of overwrite.commands) {
                const actualName = this.commands.get(command)?.name;

                if (!actualName) {
                    continue;
                }

                const existing = this.permissionOverwrites.get(
                    `${overwrite.guildId}:${actualName}`
                );
                const merged = this.mergePermissionOverwrites(overwrite.onMatch, existing, cache);
                this.permissionOverwrites.set(`${overwrite.guildId}:${actualName}`, merged);
            }
        }

        this.application.logger.debug(
            `Loaded ${permissionOverwrites.length} command permission overwrites`
        );
    }

    public async addCommand(
        command: Command,
        loadMetadata = true,
        groups: Record<string, string> | null = null,
        defaultGroup = "default"
    ) {
        const previousCommand = this.commands.get(command.name);
        let aliasGroupSet = false;

        if (loadMetadata && previousCommand) {
            await this.application.dynamicLoader.unloadEventsFromMetadata(previousCommand);
        }

        this.commands.set(command.name, command);

        for (const alias of command.aliases) {
            this.commands.set(alias, command);

            if (groups?.[alias] && !aliasGroupSet) {
                command.group = groups?.[alias];
                aliasGroupSet = true;
            }
        }

        if (!aliasGroupSet || groups?.[command.name]) {
            command.group = groups?.[command.name] ?? defaultGroup;
        }

        if (loadMetadata) {
            await this.application.dynamicLoader.loadEventsFromMetadata(command);
        }
    }

    public async runCommandFromMessage(message: Message<true>) {
        const config = this.configManager.config[message.guildId!];

        if (!config) {
            return;
        }

        const prefixes = [
            config.prefix,
            `<@${this.application.getClient().user!.id}>`,
            `<@!${this.application.getClient().user!.id}>`
        ];
        let foundPrefix;

        for (const prefix of prefixes) {
            if (message.content.startsWith(prefix)) {
                foundPrefix = prefix;
                break;
            }
        }

        if (!foundPrefix) {
            return;
        }

        const content = message.content.slice(foundPrefix.length).trim();
        const argv = content.split(/ +/);
        const [commandName, ...args] = argv;
        const command = this.commands.get(commandName);

        if (!command || !command.supportsLegacy()) {
            return false;
        }

        const context = new LegacyContext(commandName, content, message, args, argv);

        if (command.hasSubcommands) {
            const subcommandName = args[0];
            const subcommand = this.commands.get(command.isolatedSubcommands ? `${commandName}::${subcommandName}` : commandName);

            if (!subcommand) {
                const errorHandler = Reflect.getMetadata("command:subcommand_not_found_error", command.constructor);

                if (typeof errorHandler === "string") {
                    return context.error(errorHandler);
                }
                else if (typeof errorHandler === "function") {
                    await errorHandler(context, subcommandName, !subcommandName ? "not_specified" : "not_found");
                    return;
                }
                else {
                    await context.error(subcommandName ? "Invalid subcommand provided" : "Please provide a subcommand!");
                    return;
                }
            }

            return this.runSubcommand(subcommand, context);
        }

        return this.execCommand(command, context);
    }

    private async execCommand(command: Command, context: Context, subcommand = false) {
        try {
            await command.run(context, subcommand);
            return true;
        } catch (error) {
            if (error instanceof CommandAbortedError) {
                await error.sendMessage(context);
                return false;
            }

            this.application.logger.error(error);
            return false;
        }
    }

    public async runCommandFromInteraction(interaction: CommandInteraction) {
        const { commandName } = interaction;
        const baseCommand = this.commands.get(commandName);

        if (!baseCommand || !baseCommand.supportsInteraction()) {
            return false;
        }

        const subcommand = interaction.options.data.find(
            e => e.type === ApplicationCommandOptionType.Subcommand
        )?.name;

        const command = this.commands.get(
            subcommand && baseCommand.isolatedSubcommands && baseCommand.hasSubcommands ? `${commandName}::${subcommand}` : commandName
        );

        if (!command || !command.supportsInteraction() || (subcommand && baseCommand.hasSubcommands && !baseCommand.subcommands.includes(subcommand))) {
            return false;
        }

        const context = new InteractionContext(
            commandName,
            interaction as ChatInputCommandInteraction | ContextMenuCommandInteraction
        );

        try {
            await command.run(context, !!subcommand && baseCommand.isolatedSubcommands && baseCommand.hasSubcommands);
            return true;
        } catch (error) {
            if (error instanceof CommandAbortedError) {
                await error.sendMessage(context);
                return false;
            }

            this.application.logger.error(error);
        }
    }

    protected requirementCheckChannels(
        _action: CommandPermissionOverwriteAction,
        context: Context,
        channels: Snowflake[] | null
    ) {
        return !channels || channels.includes(context.channelId);
    }

    protected requirementCheckRoles(
        _action: CommandPermissionOverwriteAction,
        context: Context,
        roles: CommandOverwriteLogic<Snowflake> | null
    ) {
        if (!context.member) {
            return false;
        }

        if (!roles) {
            return true;
        }

        if (roles.and) {
            for (const role of roles.and) {
                if (!context.member.roles.cache.has(role)) {
                    return false;
                }
            }
        }

        if (roles.deepAnd) {
            for (const set of roles.deepAnd) {
                let matched = false;

                for (const role of set) {
                    if (context.member.roles.cache.has(role)) {
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    return false;
                }
            }
        }

        return true;
    }

    protected async requirementCheckLevel(
        _action: CommandPermissionOverwriteAction,
        context: Context,
        level: number | null
    ) {
        if (!context.member) {
            return false;
        }

        if (level === null) {
            return true;
        }

        const mode = this.configManager.config[context.guildId!]?.permissions.mode;

        if (mode !== "levels") {
            this.application.logger.warn(
                "Level-based permission manager is disabled, but a level-based permission check was attempted."
            );
            return true;
        }

        const manager = this.application.getServiceByName("permissionManager").managers.levels;

        if (manager && manager instanceof LevelBasedPermissionManager) {
            const memberLevel = await manager.getMemberLevel(context.member);
            return memberLevel >= level;
        }

        return false;
    }

    protected requirementCheckPermissions(
        _action: CommandPermissionOverwriteAction,
        context: Context,
        permissions: CommandOverwriteLogic<PermissionsString> | null,
        memberPermissions: PermissionResolvable[]
    ) {
        if (!context.member) {
            return false;
        }

        if (!permissions) {
            return true;
        }

        const bitfield = new PermissionsBitField(memberPermissions);

        if (permissions.and) {
            for (const permission of permissions.and) {
                if (!bitfield.has(permission, true)) {
                    return false;
                }
            }
        }

        if (permissions.deepAnd) {
            for (const set of permissions.deepAnd) {
                let matched = false;

                for (const permission of set) {
                    if (bitfield.has(permission, true)) {
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    return false;
                }
            }
        }

        return true;
    }

    protected requirementCheckSystemPermissions(
        _action: CommandPermissionOverwriteAction,
        context: Context,
        permissions: CommandOverwriteLogic<SystemPermissionLikeString> | null,
        permissionStrings: SystemPermissionLikeString[]
    ) {
        if (!context.member) {
            return false;
        }

        if (!permissions) {
            return true;
        }

        if (permissions.and) {
            for (const permission of permissions.and) {
                if (!permissionStrings.includes(permission)) {
                    return false;
                }
            }
        }

        if (permissions.deepAnd) {
            for (const set of permissions.deepAnd) {
                let matched = false;

                for (const permission of set) {
                    if (permissionStrings.includes(permission)) {
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    return false;
                }
            }
        }

        return true;
    }

    protected requirementCheckUsers(
        _action: CommandPermissionOverwriteAction,
        context: Context,
        users: CommandOverwriteLogic<Snowflake> | null
    ) {
        if (!context.member) {
            return false;
        }

        if (!users) {
            return true;
        }

        and: if (users.and) {
            for (const user of users.and) {
                if (context.member.id === user) {
                    break and;
                }
            }

            return false;
        }

        if (users.deepAnd) {
            for (const set of users.deepAnd) {
                let matched = false;

                for (const user of set) {
                    if (context.member.id === user) {
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * The requirement logic is structured in an array of arrays, where each
     * array is a set of requirements that are checked with the AND operator.
     * And, the elements inside the inner array are checked with the OR operator.
     *
     * [[1, 2], [3, 4], [5, 6], 7] => (1 OR 2) AND (3 OR 4) AND (5 OR 6) AND 7
     */
    protected makeLogicArray<T>(array: Array<T | T[]>): CommandOverwriteLogic<T> {
        const deepAnd = [];
        const and = new Set<T>();

        for (const item of array) {
            if (Array.isArray(item)) {
                deepAnd.push(new Set(item));
                continue;
            }

            and.add(item);
        }

        return {
            and: and.size ? Array.from(and) : undefined,
            deepAnd: deepAnd.length ? deepAnd.map(set => Array.from(set)) : undefined
        };
    }

    protected makeCache(overwrite: CommandPermissionOverwrite) {
        const picked = pick(overwrite, [
            "requiredChannels",
            "requiredRoles",
            "requiredLevel",
            "requiredDiscordPermissions",
            "requiredSystemPermissions",
            "requiredUsers"
        ]) as {
            [K in keyof MinimalCommandPermissionOverwrite]:
                | MinimalCommandPermissionOverwrite[K]
                | null;
        };

        const cache: CachedMinimalCommandPermissionOverwrite = {
            requiredLevel: picked.requiredLevel,
            requiredChannels: picked.requiredChannels
                ? [...(picked.requiredChannels as Snowflake[])]
                : null,
            requiredRoles: picked.requiredRoles
                ? this.makeLogicArray(picked.requiredRoles as Snowflake[][])
                : null,
            requiredPermissions: picked.requiredDiscordPermissions
                ? this.makeLogicArray(picked.requiredDiscordPermissions as PermissionsString[][])
                : null,
            requiredSystemPermissions: picked.requiredSystemPermissions
                ? this.makeLogicArray(
                      picked.requiredSystemPermissions as SystemPermissionLikeString[][]
                  )
                : null,
            requiredUsers: picked.requiredUsers
                ? this.makeLogicArray(picked.requiredUsers as Snowflake[][])
                : null
        };

        return cache;
    }

    protected logicConcat<T>(
        a: CommandOverwriteLogic<T> | null,
        b: CommandOverwriteLogic<T> | null
    ) {
        if (!a && !b) {
            return null;
        }

        if (!a) {
            return b;
        }

        if (!b) {
            return a;
        }

        const and = new Set<T>();
        const deepAnd = [];

        if (a.and) {
            for (const item of a.and) {
                and.add(item);
            }
        }

        if (b.and) {
            for (const item of b.and) {
                and.add(item);
            }
        }

        if (a.deepAnd) {
            for (const set of a.deepAnd) {
                deepAnd.push(new Set(set));
            }
        }

        if (b.deepAnd) {
            for (const set of b.deepAnd) {
                deepAnd.push(new Set(set));
            }
        }

        return {
            and: and.size ? Array.from(and) : undefined,
            deepAnd: deepAnd.length ? deepAnd.map(set => Array.from(set)) : undefined
        };
    }

    protected concatArrays<T>(a: T[] | null, b: T[] | null) {
        if (!a && !b) {
            return null;
        }

        if (!a) {
            return b;
        }

        if (!b) {
            return a;
        }

        return a.concat(b);
    }

    protected mergePermissionOverwrites(
        onMatch: CommandPermissionOverwriteAction,
        base?: CachedCommandPermissionOverwrites,
        other?: CachedMinimalCommandPermissionOverwrite
    ) {
        if (!base) {
            return {
                allow: onMatch === "ALLOW" && other ? other : null,
                deny: onMatch === "DENY" && other ? other : null
            } satisfies CachedCommandPermissionOverwrites;
        }

        if (!other) {
            return base;
        }

        const target = onMatch === "ALLOW" ? "allow" : "deny";
        const existing = base[target];

        if (!existing) {
            base[target] = other;
        } else {
            base[target] = {
                requiredChannels: this.concatArrays(
                    other.requiredChannels,
                    existing.requiredChannels
                ),
                requiredRoles: this.logicConcat(other.requiredRoles, existing.requiredRoles),
                requiredLevel: other.requiredLevel ?? existing.requiredLevel,
                requiredPermissions: this.logicConcat(
                    other.requiredPermissions,
                    existing.requiredPermissions
                ),
                requiredSystemPermissions: this.logicConcat(
                    other.requiredSystemPermissions,
                    existing.requiredSystemPermissions
                ),
                requiredUsers: this.logicConcat(other.requiredUsers, existing.requiredUsers)
            };
        }

        return base;
    }

    public async checkCommandPermissionOverwrites(
        context: Context,
        name: string,
        alreadyComputedPermissions?: MemberPermissionData
    ) {
        if (!context.member) {
            return null;
        }

        const guildId = context.guildId;
        const permissionOverwrite = this.permissionOverwrites.get(`${guildId}:${name}`);

        if (!permissionOverwrite) {
            return { overwrite: false, allow: true };
        }

        const { allow, deny } = permissionOverwrite;
        let allowMatched = false,
            denyMatched = false;
        const memberPermissions =
            alreadyComputedPermissions ??
            (await this.application
                .getServiceByName("permissionManager")
                .getMemberPermissions(context.member));

        if (allow) {
            if (await this.performChecks("ALLOW", allow, context, memberPermissions)) {
                allowMatched = true;
            }
        }

        if (deny) {
            if (await this.performChecks("DENY", deny, context, memberPermissions)) {
                denyMatched = true;
            }
        }

        return { overwrite: true, allow: allowMatched && !denyMatched };
    }

    protected async performChecks(
        action: CommandPermissionOverwriteAction,
        cachedOverwrite: CachedMinimalCommandPermissionOverwrite,
        context: Context,
        memberPermissions: MemberPermissionData
    ) {
        return (
            this.requirementCheckChannels(action, context, cachedOverwrite.requiredChannels) &&
            this.requirementCheckRoles(action, context, cachedOverwrite.requiredRoles) &&
            (await this.requirementCheckLevel(action, context, cachedOverwrite.requiredLevel)) &&
            this.requirementCheckPermissions(
                action,
                context,
                cachedOverwrite.requiredPermissions,
                memberPermissions.grantedDiscordPermissions.toArray()
            ) &&
            this.requirementCheckSystemPermissions(
                action,
                context,
                cachedOverwrite.requiredSystemPermissions,
                memberPermissions.grantedSystemPermissions.toArray()
            ) &&
            this.requirementCheckUsers(action, context, cachedOverwrite.requiredUsers)
        );
    }

    private runSubcommand(subcommand: Command<ContextType.ChatInput | ContextType.Legacy>, context: Context) {
        return this.execCommand(subcommand, context, true);
    }
}

export default CommandManager;
