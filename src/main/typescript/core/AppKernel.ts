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

import BaseApplication from "@framework/app/Application";
import Application from "@main/core/Application";
import ClassLoader from "@framework/class/ClassLoader";
import type Command from "@framework/commands/Command";
import Kernel from "@framework/core/Kernel";
import AbstractDatabase from "@framework/database/AbstractDatabase";
import type EventListener from "@framework/events/EventListener";
import { Logger } from "@framework/log/Logger";
import type PermissionManagerServiceInterface from "@framework/permissions/PermissionManagerServiceInterface";
import type { Events } from "@framework/types/ClientEvents";
import type { DefaultExport } from "@framework/types/Utils";
import { getBundleData } from "@framework/utils/bundle";
import Database from "@main/database/Database";
import { env } from "@main/env/env";
import type CommandManagerService from "@main/services/CommandManagerService";
import { SERVICE_COMMAND_MANAGER } from "@main/services/CommandManagerService";
import type PermissionManagerService from "@main/services/PermissionManagerService";
import { SERVICE_PERMISSION_MANAGER } from "@main/services/PermissionManagerService";
import type { ClientOptions } from "discord.js";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import path from "path";

export type AppKernelOptions = {
    shards?: number[];
    shardCount?: number;
};

class AppKernel extends Kernel {
    public readonly logger = Logger.getLogger(AppKernel);

    public readonly aliases: Readonly<Record<string, string>> = {
        services: path.resolve(__dirname, "../services"),
        automod: path.resolve(__dirname, "../automod")
    };
    public readonly services: readonly string[] = [
        "@services/StartupManagerService",
        "@services/ConfigurationManagerService",
        "@services/PermissionManagerService",
        "@services/CommandManagerService"
    ];

    public readonly eventListenersDirectory: string = path.join(__dirname, "../events");
    public readonly commandsDirectory: string = path.join(__dirname, "../commands");

    public readonly shards?: number[];
    public readonly shardCount?: number;
    public override readonly client: Client<boolean>;

    public constructor(options?: AppKernelOptions) {
        super();
        this.shards = options?.shards;
        this.shardCount = options?.shardCount;
        this.client = this.createClient();
    }

    private createClient(): Client {
        const options: ClientOptions = {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages
            ],
            partials: [Partials.Channel]
        };

        if (this.shards && this.shardCount) {
            options.shards = this.shards;
            options.shardCount = this.shardCount;
        }

        return new Client(options);
    }

    private abort() {
        this.logger.fatal("Kernel boot aborted");
        process.exit(-1);
    }

    private registerFactories(application: Application): void {
        const bindings = [
            {
                type: Logger,
                id: "logger",
                singleton: true,
                factory: () => application.logger
            },
            {
                type: Application,
                id: "application",
                singleton: true,
                factory: () => application
            },
            {
                type: BaseApplication,
                id: "application::base",
                singleton: true,
                factory: () => application
            },
            {
                type: AppKernel,
                id: "kernel",
                singleton: true,
                factory: () => this
            },
            {
                type: Client,
                id: "client",
                singleton: true,
                factory: () => this.client
            },
            {
                type: ClassLoader,
                id: "classLoader",
                singleton: true,
                factory: () => application.classLoader
            },
            {
                type: Database,
                id: "database",
                singleton: true,
                factory: () => application.database
            },
            {
                type: AbstractDatabase,
                id: "database::base",
                singleton: true,
                factory: () => application.database
            }
        ] as const;

        for (const binding of bindings) {
            application.container.register<object>(binding);
        }
    }

    private async loadServices(application: Application): Promise<void> {
        await application.serviceManager.load(this.services, this.aliases);
    }

    private async loadEventListeners(application: Application): Promise<void> {
        const onLoad = async (
            filepath: string,
            eventListenerClass: new (application: Application) => EventListener<Events>
        ) => {
            const eventListener = application.container.get(eventListenerClass, {
                constructorArgs: [application]
            });
            await eventListener.onAppBoot?.();
            this.client.on(eventListener.type as never, eventListener.onEvent.bind(eventListener));
            application.logger.info("Loaded event listener: ", path.basename(filepath).replace(/\..*$/, ""));
        };

        if (isBundle) {
            const data = getBundleData();

            if (!data?.events) {
                return;
            }

            for (const event in data.events) {
                await onLoad(event, data.events[event]);
            }

            return;
        }

        await application.classLoader.loadClassesRecursive<
            DefaultExport<new (application: Application) => EventListener<Events>>
        >(this.eventListenersDirectory, {
            preLoad: filepath => {
                application.logger.debug("Loading event listener: ", path.basename(filepath).replace(/\..*$/, ""));
            },
            postLoad: async (filepath, { default: EventListenerClass }) => {
                await onLoad(filepath, EventListenerClass);
            }
        });
    }

    private async loadCommands(application: Application): Promise<void> {
        const commandManagerService = application.serviceManager.services.get(SERVICE_COMMAND_MANAGER) as
            | CommandManagerService
            | undefined;
        const permissionManagerService = application.serviceManager.services.get(SERVICE_PERMISSION_MANAGER) as
            | PermissionManagerService
            | undefined;

        const onLoad = async (
            filepath: string,
            commandClass: new (
                application: Application,
                permissionManagerService: PermissionManagerServiceInterface
            ) => Command
        ) => {
            const command = application.container.get(commandClass, {
                constructorArgs: [application, permissionManagerService]
            });

            await command.onAppBoot?.();
            const category = path.basename(path.dirname(filepath)).toLowerCase();

            commandManagerService?.register(command, category);
            application.logger.info(
                `Loaded command: ${command.name} (${path.basename(filepath).replace(/\..*$/, "")})`
            );
        };

        if (isBundle) {
            const data = getBundleData();

            if (!data?.commands) {
                return;
            }

            for (const command in data.commands) {
                await onLoad(command, data.commands[command]);
            }

            return;
        }

        await application.classLoader.loadClassesRecursive<
            DefaultExport<
                new (application: Application, permissionManagerService: PermissionManagerServiceInterface) => Command
            >
        >(this.commandsDirectory, {
            preLoad: filepath => {
                application.logger.debug("Loading command: ", path.basename(filepath).replace(/\..*$/, ""));
            },
            postLoad: async (filepath, { default: CommandClass }) => {
                await onLoad(filepath, CommandClass);
            }
        });
    }

    public async boot(application: Application): Promise<void> {
        this.registerFactories(application);
        await this.loadServices(application);
        await this.loadEventListeners(application);
        await this.loadCommands(application);
    }

    public async run(_application: Application): Promise<void> {
        await Promise.resolve();
        await this.client.login(env().SUDOBOT_TOKEN);
    }
}

export default AppKernel;
