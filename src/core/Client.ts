/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { PrismaClient } from "@prisma/client";
import { ClientOptions, Collection, Client as DiscordClient, GuildEmoji, UserResolvable } from "discord.js";
import fs from "fs/promises";
import path, { basename, dirname } from "path";
import Server from "../api/Server";
import type Antijoin from "../automod/Antijoin";
import type Antiraid from "../automod/Antiraid";
import type Antispam from "../automod/Antispam";
import type MessageFilter from "../automod/MessageFilter";
import type ProfileFilter from "../automod/ProfileFilter";
import { SuppressErrorsMetadata } from "../decorators/SuppressErrors";
import type AutoRoleService from "../services/AutoRoleService";
import type ChannelLockManager from "../services/ChannelLockManager";
import type CommandManager from "../services/CommandManager";
import type ConfigManager from "../services/ConfigManager";
import type InfractionManager from "../services/InfractionManager";
import type LoggerService from "../services/LoggerService";
import type MetadataService from "../services/MetadataService";
import type PermissionManager from "../services/PermissionManager";
import type QueueManager from "../services/QueueManager";
import type QuickMuteService from "../services/QuickMuteService";
import type SnippetManager from "../services/SnippetManager";
import type StartupManager from "../services/StartupManager";
import type TranslationService from "../services/TranslationService";
import type WelcomerService from "../services/WelcomerService";
import { log, logError, logInfo } from "../utils/logger";
import type Command from "./Command";
import ServiceManager from "./ServiceManager";

export default class Client<Ready extends boolean = boolean> extends DiscordClient<Ready> {
    aliases = {
        "@services": path.resolve(__dirname, "../services"),
        "@automod": path.resolve(__dirname, "../automod")
    };

    services = [
        "@services/StartupManager",
        "@services/ConfigManager",
        "@services/CommandManager",
        "@services/InfractionManager",
        "@services/LoggerService",
        "@services/QueueManager",
        "@services/WelcomerService",
        "@services/SnippetManager",
        "@services/ChannelLockManager",
        "@services/PermissionManager",
        "@services/MetadataService",
        "@services/QuickMuteService",
        "@services/TranslationService",
        "@services/AutoRoleService",

        "@automod/MessageFilter",
        "@automod/Antispam",
        "@automod/Antiraid",
        "@automod/Antijoin",
        "@automod/ProfileFilter"
    ];

    commandsDirectory = path.resolve(__dirname, "../commands");
    eventsDirectory = path.resolve(__dirname, "../events");

    serviceManager = new ServiceManager(this);

    startupManager: StartupManager = {} as StartupManager;
    configManager: ConfigManager = {} as ConfigManager;
    commandManager: CommandManager = {} as CommandManager;
    infractionManager: InfractionManager = {} as InfractionManager;
    logger: LoggerService = {} as LoggerService;
    messageFilter: MessageFilter = {} as MessageFilter;
    antispam: Antispam = {} as Antispam;
    queueManager: QueueManager = {} as QueueManager;
    snippetManager: SnippetManager = {} as SnippetManager;
    welcomerService: WelcomerService = {} as WelcomerService;
    antiraid: Antiraid = {} as Antiraid;
    channelLockManager: ChannelLockManager = {} as ChannelLockManager;
    antijoin: Antijoin = {} as Antijoin;
    profileFilter: ProfileFilter = {} as ProfileFilter;
    permissionManager: PermissionManager = {} as PermissionManager;
    metadata: MetadataService = {} as MetadataService;
    quickMute: QuickMuteService = {} as QuickMuteService;
    translator: TranslationService = {} as TranslationService;
    autorole: AutoRoleService = {} as AutoRoleService;

    prisma = new PrismaClient({
        errorFormat: "pretty",
        log: ["query", "error", "info", "warn"]
    });

    server = new Server(this);

    commands = new Collection<string, Command>();
    emojiMap = new Collection<string, GuildEmoji>();

    constructor(options: ClientOptions, { services }: { services?: string[] } = {}) {
        super(options);

        if (services) {
            this.services = services;
        }
    }

    async boot() {
        await this.serviceManager.loadServices();
    }

    async fetchUserSafe(user: UserResolvable) {
        try {
            return await this.users.fetch(user);
        } catch (e) {
            logError(e);
            return null;
        }
    }

    async loadCommands(directory = this.commandsDirectory) {
        const files = await fs.readdir(directory);
        const includeOnly = process.env.COMMANDS?.split(",");

        for (const file of files) {
            const filePath = path.join(directory, file);
            const isDirectory = (await fs.lstat(filePath)).isDirectory();

            if (isDirectory) {
                await this.loadCommands(filePath);
                continue;
            }

            if (!file.endsWith(".ts") && !file.endsWith(".js")) {
                continue;
            }

            if (includeOnly && !includeOnly.includes(file.replace(/\.(ts|js)/gi, ""))) {
                continue;
            }

            const { default: CommandClass }: { default: new (client: Client) => Command } = await import(filePath);
            const command = new CommandClass(this);
            command.group = basename(dirname(filePath));
            this.commands.set(command.name, command);

            for (const alias of command.aliases) {
                this.commands.set(alias, command);
            }

            this.loadEventListenersFromMetadata(CommandClass, command);
            logInfo("Loaded command: ", command.name);
        }
    }

    async loadEvents(directory = this.eventsDirectory) {
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const isDirectory = (await fs.lstat(filePath)).isDirectory();

            if (isDirectory) {
                await this.loadEvents(filePath);
                continue;
            }

            if (!file.endsWith(".ts") && !file.endsWith(".js")) {
                continue;
            }

            const { default: Event } = await import(filePath);
            const event = new Event(this);
            this.on(event.name, event.execute.bind(event));
        }
    }

    private supressErrorMessagesHandler(suppressErrors: SuppressErrorsMetadata, e: unknown) {
        if (suppressErrors.mode === "log") {
            logError(e);
        } else if (suppressErrors.mode === "disabled") {
            throw e;
        }
    }

    loadEventListenersFromMetadata<I extends Object = Object>(Class: I["constructor"], instance?: I) {
        const metadata: { event: string; handler: Function; methodName: string }[] | undefined = Reflect.getMetadata(
            "event_listeners",
            Class.prototype
        );

        if (metadata) {
            for (const data of metadata) {
                const callback = instance ? data.handler.bind(instance) : data.handler;
                const suppressErrors: SuppressErrorsMetadata | undefined = Reflect.getMetadata(
                    "supress_errors",
                    Class.prototype,
                    data.methodName
                );

                this.on(
                    data.event,
                    suppressErrors
                        ? (...args: any[]) => {
                              try {
                                  const ret = callback(...args);

                                  if (ret instanceof Promise) ret.catch(e => this.supressErrorMessagesHandler(suppressErrors, e));

                                  return ret;
                              } catch (e) {
                                  this.supressErrorMessagesHandler(suppressErrors, e);
                              }
                          }
                        : callback
                );

                log("Added event listener for event: ", data.event);
            }
        }
    }

    async getHomeGuild() {
        const id = process.env.HOME_GUILD_ID;

        if (!id) {
            logError(
                "Environment variable `HOME_GUILD_ID` is not set. The bot can't work without it. Please follow the setup guide in the bot documentation."
            );
            process.exit(-1);
        }

        try {
            return this.guilds.cache.get(id) || (await this.guilds.fetch(id));
        } catch (e) {
            logError(e);
            logError("Error fetching home guild: make sure the ID inside `HOME_GUILD_ID` environment variable is correct.");
            process.exit(-1);
        }
    }
}
