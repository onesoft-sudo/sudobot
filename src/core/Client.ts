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
import {
    ClientOptions,
    Collection,
    ClientEvents as DiscordClientEvents,
    Client as DiscordJSClient,
    GuildEmoji
} from "discord.js";
import path from "node:path";
import Server from "../api/Server";
import type AIAutoModService from "../automod/AIAutoModService";
import type Antijoin from "../automod/Antijoin";
import type Antiraid from "../automod/Antiraid";
import type Antispam from "../automod/Antispam";
import type FileFilterService from "../automod/FileFilterService";
import type MessageFilter from "../automod/MessageFilter";
import type MessageRuleService from "../automod/MessageRuleService";
import type ProfileFilter from "../automod/ProfileFilter";
import type VerificationService from "../automod/VerificationService";
import type AFKService from "../services/AFKService";
import type AutoRoleService from "../services/AutoRoleService";
import type BallotManager from "../services/BallotManager";
import type BumpReminderService from "../services/BumpReminderService";
import type ChannelLockManager from "../services/ChannelLockManager";
import type CommandManager from "../services/CommandManager";
import type CommandPermissionOverwriteManager from "../services/CommandPermissionOverwriteManager";
import type ConfigManager from "../services/ConfigManager";
import type CooldownService from "../services/CooldownService";
import type ExtensionService from "../services/ExtensionService";
import type ImageRecognitionService from "../services/ImageRecognitionService";
import type InfractionManager from "../services/InfractionManager";
import type InviteTrackerService from "../services/InviteTrackerService";
import type KeypressHandlerService from "../services/KeypressHandlerService";
import type LogServer from "../services/LogServer";
import type LoggerService from "../services/LoggerService";
import type MetadataService from "../services/MetadataService";
import type PermissionManager from "../services/PermissionManager";
import type QueueManager from "../services/QueueManager";
import type QuickMuteService from "../services/QuickMuteService";
import type ReactionRoleService from "../services/ReactionRoleService";
import type ReportService from "../services/ReportService";
import type SnippetManager from "../services/SnippetManager";
import type StartupManager from "../services/StartupManager";
import type StatsService from "../services/StatsService";
import type TranslationService from "../services/TranslationService";
import type TriggerService from "../services/TriggerService";
import type WelcomerService from "../services/WelcomerService";
import { ClientEvents } from "../types/ClientEvents";
import { Logger } from "../utils/Logger";
import { developmentMode } from "../utils/utils";
import type Command from "./Command";
import DynamicLoader from "./DynamicLoader";
import Service from "./Service";
import ServiceManager from "./ServiceManager";

class Client<R extends boolean = boolean> extends DiscordJSClient<R> {
    public static instance: Client;
    private readonly eventListeners = new Map<string, ((...args: unknown[]) => unknown)[]>();
    public readonly commands = new Collection<string, Command>();
    public readonly emojiMap = new Map<string, GuildEmoji>();

    public readonly prisma = new PrismaClient({
        errorFormat: "pretty",
        log: developmentMode() ? ["error", "info", "query", "warn"] : ["error", "info", "warn"]
    });

    public readonly server = new Server(this);
    public readonly dynamicLoader = new DynamicLoader(this);
    public readonly serviceManager = new ServiceManager(this);

    public readonly aliases = {
        automod: path.resolve(__dirname, "../automod"),
        services: path.resolve(__dirname, "../services")
    };

    static get _logger() {
        return new Logger("system", !process.env.NO_DATETIME_LOGGING);
    }

    public readonly logger = Client._logger;

    public readonly services = [
        "@services/StartupManager",
        "@services/ConfigManager" /* This service is manually booted by the Extension Service. */,
        "@services/ExtensionService",
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
        "@services/ReactionRoleService",
        "@services/AFKService",
        "@services/InviteTrackerService",
        "@services/BallotManager",
        "@services/TriggerService",
        "@services/BumpReminderService",
        "@services/LogServer",
        "@services/CooldownService",
        "@services/KeypressHandlerService",
        "@services/CommandPermissionOverwriteManager",
        "@services/ReportService",
        "@services/StatsService",
        "@services/ImageRecognitionService",

        "@automod/MessageFilter",
        "@automod/Antispam",
        "@automod/Antiraid",
        "@automod/Antijoin",
        "@automod/ProfileFilter",
        "@automod/FileFilterService",
        "@automod/MessageRuleService",
        "@automod/AIAutoModService",
        "@automod/VerificationService"
    ];

    startupManager!: StartupManager;
    configManager!: ConfigManager;
    commandManager!: CommandManager;
    infractionManager!: InfractionManager;
    loggerService!: LoggerService;
    messageFilter!: MessageFilter;
    antispam!: Antispam;
    queueManager!: QueueManager;
    snippetManager!: SnippetManager;
    welcomerService!: WelcomerService;
    antiraid!: Antiraid;
    channelLockManager!: ChannelLockManager;
    antijoin!: Antijoin;
    profileFilter!: ProfileFilter;
    permissionManager!: PermissionManager;
    metadata!: MetadataService;
    quickMute!: QuickMuteService;
    translator!: TranslationService;
    autoRoleService!: AutoRoleService;
    reactionRoleService!: ReactionRoleService;
    afkService!: AFKService;
    inviteTracker!: InviteTrackerService;
    ballotManager!: BallotManager;
    fileFilter!: FileFilterService;
    messageRuleService!: MessageRuleService;
    triggerService!: TriggerService;
    aiAutoMod!: AIAutoModService;
    extensionService!: ExtensionService;
    bumpReminder!: BumpReminderService;
    logServer!: LogServer;
    cooldown!: CooldownService;
    keypressHandler!: KeypressHandlerService;
    verification!: VerificationService;
    reportService!: ReportService;
    commandPermissionOverwriteManager!: CommandPermissionOverwriteManager;
    statsService!: StatsService;
    imageRecognitionService!: ImageRecognitionService;

    constructor(options: ClientOptions) {
        super(options);
        Client.instance = this;
    }

    public static getLogger() {
        return this._logger;
    }

    getService<S extends Service = Service>(name: string): S {
        return this[name as keyof typeof this] as S;
    }

    async boot({ commands = true, events = true }: { commands?: boolean; events?: boolean } = {}) {
        await this.serviceManager.loadServices();

        if (events) {
            this.setMaxListeners(50);
            await this.dynamicLoader.loadEvents();
        }

        if (commands) {
            await this.dynamicLoader.loadCommands();
        }
    }

    async getHomeGuild() {
        return (
            this.guilds.cache.get(process.env.HOME_GUILD_ID) ??
            (await this.guilds.fetch(process.env.HOME_GUILD_ID))
        );
    }

    addEventListener<K extends keyof ClientEvents>(
        name: K,
        listener: (...args: ClientEvents[K]) => unknown
    ) {
        type Listener = (...args: DiscordClientEvents[keyof DiscordClientEvents]) => void;
        const handlers = this.eventListeners.get(name) ?? [];

        if (!this.eventListeners.has(name)) {
            this.eventListeners.set(name, handlers);
        }

        handlers.push(listener as (...args: unknown[]) => unknown);
        this.on(name as keyof DiscordClientEvents, listener as Listener);
    }

    removeEventListener<K extends keyof ClientEvents>(
        name: K,
        listener?: (...args: ClientEvents[K]) => unknown
    ) {
        if (!listener) {
            this.eventListeners.delete(name);
            this.removeAllListeners(name as keyof DiscordClientEvents);
            return;
        }

        const handlers = this.eventListeners.get(name) ?? [];
        const index = handlers.findIndex(handler => handler === listener);

        if (index === -1) {
            return;
        }

        const handler = handlers.splice(index, 1)[0];
        this.off(
            name as keyof DiscordClientEvents,
            handler as (...args: DiscordClientEvents[keyof DiscordClientEvents]) => void
        );
    }

    async emitWaitLocal<K extends keyof ClientEvents>(name: K, ...args: ClientEvents[K]) {
        for (const listener of this.eventListeners.get(name) ?? []) {
            await listener(...(args as unknown[]));
        }
    }

    emitWait<K extends keyof ClientEvents>(name: K, ...args: ClientEvents[K]) {
        for (const listener of this.eventListeners.get(name) ?? []) {
            listener(...(args as unknown[]));
        }
    }
}

export default Client;
