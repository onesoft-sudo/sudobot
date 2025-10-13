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

import ArgumentParser from "@framework/arguments/ArgumentParser";
import { Command } from "@framework/commands/Command";
import CommandAbortedError from "@framework/commands/CommandAbortedError";
import Context from "@framework/commands/Context";
import { ContextType } from "@framework/commands/ContextType";
import InteractionContext from "@framework/commands/InteractionContext";
import LegacyContext from "@framework/commands/LegacyContext";
import { Inject } from "@framework/container/Inject";
import { CommandManagerServiceInterface } from "@framework/contracts/CommandManagerServiceInterface";
import { MemberPermissionData } from "@framework/contracts/PermissionManagerInterface";
import { SystemPermissionLikeString } from "@framework/permissions/AbstractPermissionManagerService";
import { PermissionDeniedError } from "@framework/permissions/PermissionDeniedError";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { isDevelopmentMode } from "@framework/utils/utils";
import { getEnvData } from "@main/env/env";
import { CommandPermissionOverwrite, CommandPermissionOverwriteAction } from "@main/models/CommandPermissionOverwrite";
import CommandRateLimiter from "@main/security/CommandRateLimiter";
import {
    ApplicationCommandDataResolvable,
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
import CommandPermissionOverwriteCacheStore, {
    CachedCommandPermissionOverwrites,
    CachedMinimalCommandPermissionOverwrite,
    CommandOverwriteLogic
} from "../cache/CommandPermissionOverwriteCacheStore";
import LevelBasedPermissionManager from "../security/LevelBasedPermissionManager";
import { developmentMode } from "../utils/utils";
import type ConfigurationManager from "./ConfigurationManager";

@Name("commandManager")
class CommandManager extends Service implements CommandManagerServiceInterface {
    public readonly argumentParser = new ArgumentParser();
    public readonly commands = new Collection<string, Command>();
    public readonly store = new CommandPermissionOverwriteCacheStore(this);
    public readonly ratelimiter = new CommandRateLimiter(this.application);

    @Inject("configManager")
    protected readonly configManager!: ConfigurationManager;

    public async onReady() {
        await this.registerApplicationCommands();
    }

    public invalidatePermissionOverwrite(overwrite: CommandPermissionOverwrite) {
        return this.store.invalidate(overwrite);
    }

    public getApplicationCommandDataResolvableList(): ApplicationCommandDataResolvable[] {
        return this.commands
            .filter(
                (command, key) =>
                    !command.name.includes("::") && command.name.toLowerCase() === key && command.supportsInteraction()
            )
            .map(command => command.build().map(builder => builder.toJSON() as ApplicationCommandDataResolvable))
            .flat();
    }

    public async updateApplicationCommands({ commands, clear, global }: ApplicationCommandUpdateOptions = {}) {
        if (clear) {
            commands = [];
        } else {
            commands ??= this.getApplicationCommandDataResolvableList();
        }

        if (!commands.length && !clear) {
            this.application.logger.debug("No commands to update");
            return 0;
        }

        const guildId = global ? undefined : getEnvData().HOME_GUILD_ID;

        if (guildId) {
            await this.client.guilds.cache.get(guildId)?.commands.set(commands);
        } else {
            await this.client.application?.commands.set(commands);
        }

        this.application.logger.info(`Updated ${commands.length} application ${guildId ? "guild " : ""}commands`);

        return commands.length;
    }

    public async registerApplicationCommands() {
        const existingApplicationCommands = await this.client.application?.commands.fetch();

        if (existingApplicationCommands?.size && !developmentMode()) {
            this.application.logger.debug("Skipped registering application commands as they're already registered");
            return;
        }

        const mode = this.configManager.systemConfig.commands.register_application_commands_on_boot;

        if (mode === "none") {
            this.application.logger.debug("Skipped registering application commands as it's disabled");

            return;
        }

        const clear = process.argv.includes("--clear-commands") || process.argv.includes("-c");
        const global = process.argv.includes("--global-commands") || process.argv.includes("-g");
        const commands = clear ? [] : this.getApplicationCommandDataResolvableList();

        if (!clear && !commands.length) {
            this.application.logger.debug("No commands to register");
            return;
        }

        let guildId = mode === "guild" && !global ? process.env.HOME_GUILD_ID : undefined;
        let registered = false;

        if (guildId) {
            await this.client.application?.commands.set(commands, guildId);
            registered = true;
        } else if (mode === "always_global") {
            await this.client.application?.commands.set(commands);
            this.application.logger.debug(
                "Registering global commands on every startup is not recommended, as you may hit the global rate limit."
            );
            this.application.logger.debug("Please consider using guild commands instead, for testing purposes.");
            registered = true;
        } else if (
            (mode === "auto_global" || global) &&
            (process.argv.includes("--update-commands") || process.argv.includes("-u") || clear)
        ) {
            if (isDevelopmentMode() && !global) {
                this.client.guilds.cache
                    .find(g => g.id === process.env.HOME_GUILD_ID)
                    ?.commands.set(commands)
                    .catch(this.application.logger.error);
                guildId = process.env.HOME_GUILD_ID;
            } else {
                await this.client.application?.commands.set(commands);
            }

            registered = true;
        }

        if (registered) {
            this.application.logger.info(
                `Registered ${commands.length} application ${guildId ? "guild " : ""}commands`
            );
        }
    }

    public getArgumentParser() {
        return this.argumentParser;
    }

    public getCommand(name: string): Command | null {
        return this.commands.get(name.toLowerCase()) ?? null;
    }

    public getRateLimiter() {
        return this.ratelimiter;
    }

    public addCommand(
        command: Command,
        loadMetadata = true,
        groups: Record<string, string> | null = null,
        defaultGroup = "default"
    ) {
        const previousCommand = this.getCommand(command.name);
        let aliasGroupSet = false;

        if (loadMetadata && previousCommand) {
            this.application.classLoader.unloadEventsFromMetadata(previousCommand);
        }

        const loweredName = command.name.toLowerCase();
        this.commands.set(loweredName, command);

        for (const alias of command.aliases) {
            const loweredAlias = alias.toLowerCase();
            this.commands.set(loweredAlias, command);

            if (groups?.[loweredAlias] && !aliasGroupSet) {
                command.group = groups?.[loweredAlias];
                aliasGroupSet = true;
            }
        }

        if (!aliasGroupSet || groups?.[loweredName]) {
            command.group = groups?.[loweredName] ?? defaultGroup;
        }

        if (loadMetadata) {
            this.application.classLoader.loadEventsFromMetadata(command);
        }
    }

    public async reloadCommand(command: Command) {
        const previousCommand = this.getCommand(command.name);

        if (!previousCommand || !previousCommand.file) {
            this.application.logger.debug(`Command ${command.name} is not reloadable.`);
            return;
        }

        this.application.classLoader.unloadEventsFromMetadata(previousCommand);
        this.commands.delete(command.name.toLowerCase());

        for (const alias of command.aliases) {
            this.commands.delete(alias.toLowerCase());
        }

        // remove require cache
        delete require.cache[require.resolve(previousCommand.file)];
        return this.application.classLoader.loadCommand(previousCommand.file, true);
    }

    public getCanonicalName(name: string) {
        return this.getCommand(name)?.name ?? name;
    }

    public async runCommandFromMessage(message: Message<true>) {
        if (this.configManager.systemConfig.commands.system_banned_users.includes(message.author.id)) {
            return;
        }

        const config = this.configManager.config[message.guildId];

        if (!config) {
            return;
        }

        const prefixes = [config.prefix];

        if (config.commands?.mention_prefix && this.configManager.systemConfig.commands.mention_prefix) {
            prefixes.push(`<@${this.application.getClient().user!.id}>`);
            prefixes.push(`<@!${this.application.getClient().user!.id}>`);
        }

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
        const argv = content.split(/\s+/);
        const [rawCommandName, ...args] = argv;
        const commandName = rawCommandName.toLowerCase();
        const command = this.getCommand(commandName);

        if (!command) {
            this.application.logger.debug(`Command not found: ${commandName}: trying to resolve a snippet`);

            const result = await this.application
                .service("snippetManagerService")
                .resolveMessageOptions(message, commandName);

            if (!result) {
                this.application.logger.debug(
                    `Snippet not found: ${commandName}: all strategies to resolve the command failed`
                );
                return false;
            }

            const { options } = result;
            await message.reply(options).catch(this.application.logger.error);
            return true;
        }

        if (!command.supportsLegacy()) {
            return false;
        }

        const context = new LegacyContext(commandName, content, message, args, argv);
        const respondOnFail = this.configManager.config[message.guildId]?.commands.respond_on_precondition_fail;

        if (command.isDisabled(message.guildId)) {
            if (respondOnFail) {
                await context.error("This command is disabled.");
            }

            return;
        }

        if (command.hasSubcommands) {
            const subcommandName = argv.find((a, i) => i !== 0 && !a.startsWith("-"));
            const key = command.isolatedSubcommands
                ? `${this.getCanonicalName(commandName)}::${subcommandName}`
                : this.getCanonicalName(commandName);
            const subcommand = this.getCommand(key);

            if (subcommand && subcommand.isDisabled(message.guildId)) {
                if (respondOnFail) {
                    await context.error("This command is disabled.");
                }

                return;
            }

            if (!subcommand) {
                const errorHandler =
                    command?.onSubcommandNotFound?.bind(command) ??
                    Reflect.getMetadata("command:subcommand_not_found_error", command.constructor);

                if (typeof errorHandler === "string") {
                    return context.error(errorHandler);
                } else if (typeof errorHandler === "function") {
                    await errorHandler(context, subcommandName, !subcommandName ? "not_specified" : "not_found");
                    return;
                } else {
                    await context.error(
                        subcommandName ? "Invalid subcommand provided." : "Please provide a subcommand!"
                    );
                    return;
                }
            }

            return this.runSubcommand(command, subcommand, context);
        }

        return void (await this.execCommand(command, context));
    }

    private async execCommand(command: Command, context: Context, rootCommand?: Command) {
        try {
            await command.run(context, rootCommand);
            return true;
        } catch (error) {
            if (error instanceof CommandAbortedError) {
                await error.sendMessage(context);
                return false;
            }

            if (error instanceof PermissionDeniedError) {
                await context.error(error.message || "You don't have permission to run this command.");
                return false;
            }

            this.application.logger.error(error);
            return false;
        }
    }

    public async runCommandFromInteraction(interaction: CommandInteraction) {
        if (this.configManager.systemConfig.commands.system_banned_users.includes(interaction.user.id)) {
            await interaction.reply({
                content: "You are unable to use commands.",
                ephemeral: true
            });

            return;
        }

        const { commandName } = interaction;
        const baseCommand = this.getCommand(commandName);

        if (!baseCommand || !baseCommand.supportsInteraction()) {
            return false;
        }

        const subcommand = (
            interaction as ChatInputCommandInteraction | ContextMenuCommandInteraction
        ).options.data.find(e => e.type === ApplicationCommandOptionType.Subcommand)?.name;

        const command = this.getCommand(
            subcommand && baseCommand.isolatedSubcommands && baseCommand.hasSubcommands
                ? `${commandName}::${subcommand}`
                : commandName
        );

        if (
            !command ||
            !command.supportsInteraction() ||
            (subcommand && baseCommand.hasSubcommands && !baseCommand.subcommands.includes(subcommand))
        ) {
            return false;
        }

        if (!command.supportsDirectMessages && !interaction.inGuild()) {
            return false;
        }

        const context = new InteractionContext(
            commandName,
            interaction as ChatInputCommandInteraction | ContextMenuCommandInteraction
        );

        if (command.isDisabled(interaction.guildId!)) {
            if (this.configManager.config[interaction.guildId!]?.commands.respond_on_precondition_fail) {
                await context.error("This command is disabled.");
            }

            return;
        }

        try {
            await command.run(
                context,
                !!subcommand && baseCommand.isolatedSubcommands && baseCommand.hasSubcommands ? baseCommand : undefined
            );
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

        const mode = this.configManager.config[context.guildId]?.permissions.mode;

        if (mode !== "levels") {
            this.application.logger.warn(
                "Level-based permission manager is disabled, but a level-based permission check was attempted."
            );
            return true;
        }

        const manager = this.application.service("permissionManager").managers.levels;

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

    protected mergePermissionOverwrites(
        onMatch: CommandPermissionOverwriteAction,
        base?: CachedCommandPermissionOverwrites,
        other?: CachedMinimalCommandPermissionOverwrite
    ) {
        if (!base) {
            return {
                allow: onMatch === CommandPermissionOverwriteAction.Allow && other ? other : null,
                deny: onMatch === CommandPermissionOverwriteAction.Deny && other ? other : null
            } satisfies CachedCommandPermissionOverwrites;
        }

        if (!other) {
            return base;
        }

        const target = onMatch === CommandPermissionOverwriteAction.Allow ? "allow" : "deny";
        const existing = base[target];

        if (!existing) {
            base[target] = other;
        } else {
            base[target] = {
                ids: existing.ids.concat(other.ids),
                requiredChannels: this.store.concatArrays(other.requiredChannels, existing.requiredChannels),
                requiredRoles: this.store.logicConcat(other.requiredRoles, existing.requiredRoles),
                requiredLevel: other.requiredLevel ?? existing.requiredLevel,
                requiredPermissions: this.store.logicConcat(other.requiredPermissions, existing.requiredPermissions),
                requiredSystemPermissions: this.store.logicConcat(
                    other.requiredSystemPermissions,
                    existing.requiredSystemPermissions
                ),
                requiredUsers: this.store.logicConcat(other.requiredUsers, existing.requiredUsers)
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
        const permissionOverwrite = await this.store.fetch(guildId, name);

        if (!permissionOverwrite) {
            return { overwrite: false, allow: true };
        }

        const { allow, deny } = permissionOverwrite;
        let allowMatched = false,
            denyMatched = false;
        const memberPermissions =
            alreadyComputedPermissions ??
            (await this.application.service("permissionManager").getMemberPermissions(context.member));

        if (allow) {
            if (await this.performChecks(CommandPermissionOverwriteAction.Allow, allow, context, memberPermissions)) {
                allowMatched = true;
            }
        }

        if (deny) {
            if (await this.performChecks(CommandPermissionOverwriteAction.Deny, deny, context, memberPermissions)) {
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

    private async runSubcommand(
        command: Command<ContextType.ChatInput | ContextType.Legacy>,
        subcommand: Command<ContextType.ChatInput | ContextType.Legacy>,
        context: Context
    ) {
        const { passed } = await command.runPreconditions(context);

        if (!passed) {
            return false;
        }

        return this.execCommand(subcommand, context, command);
    }
}

type ApplicationCommandUpdateOptions = {
    clear?: boolean;
    global?: boolean;
    commands?: ApplicationCommandDataResolvable[];
};

export default CommandManager;
