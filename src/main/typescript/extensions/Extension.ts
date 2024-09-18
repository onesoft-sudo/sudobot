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

import type Application from "@framework/app/Application";
import type { Command } from "@framework/commands/Command";
import type EventListener from "@framework/events/EventListener";
import type { Service } from "@framework/services/Service";
import type { ServiceManager } from "@framework/services/ServiceManager";
import type { Class } from "@framework/types/Utils";
import type CommandManager from "@main/services/CommandManager";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type ExtensionManager from "@main/services/ExtensionManager";
import type { Awaitable } from "discord.js";
import path from "path";
import { z, type ZodSchema } from "zod";

export const ExtensionMetadataSchema = z.object({
    main: z.string().optional(),
    src_main: z.string().optional(),
    src_directory: z.string().optional(),
    build_directory: z.string().optional(),
    language: z.enum(["typescript", "javascript"]).optional(),
    build_command: z.string().optional(),
    resources: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    id: z.string({ required_error: "Extension ID is required" }),
    icon: z.string().optional(),
    readmeFileName: z.string().default("README.md")
});

export type ExtensionMetadataType = z.infer<typeof ExtensionMetadataSchema>;

export abstract class Extension {
    protected readonly application: Application;
    protected readonly manager: ExtensionManager;
    private _commandManager?: CommandManager;
    private _configManager?: ConfigurationManager;
    private _serviceManager?: ServiceManager;

    public readonly id: string;
    public readonly name: string;
    public readonly path: string;
    public readonly mainFilePath: string;

    protected readonly meta: ExtensionMetadataType;

    public constructor(
        manager: ExtensionManager,
        id: string,
        name: string,
        mainFilePath: string,
        meta: ExtensionMetadataType,
        application: Application
    ) {
        this.id = id;
        this.name = name;
        this.mainFilePath = mainFilePath;
        this.path = path.dirname(mainFilePath);
        this.application = application;
        this.meta = meta;
        this.manager = manager;
    }

    protected get commandManager(): CommandManager {
        if (!this._commandManager) {
            throw new Error(
                `Accessing command manager before it is initialized in extension ${this.name}`
            );
        }

        return this._commandManager;
    }

    protected get configManager(): ConfigurationManager {
        if (!this._configManager) {
            throw new Error(
                `Accessing config manager before it is initialized in extension ${this.name}`
            );
        }

        return this._configManager;
    }

    protected get serviceManager(): ServiceManager {
        if (!this._serviceManager) {
            throw new Error(
                `Accessing service manager before it is initialized in extension ${this.name}`
            );
        }

        return this._serviceManager;
    }

    public postConstruct() {
        this._commandManager = this.application.service("commandManager");
        this._configManager = this.application.service("configManager");
        this._serviceManager = this.application.serviceManager;
    }

    protected commands(): Awaitable<Class<Command, [Application]>[]> {
        return [];
    }

    protected events(): Awaitable<Class<EventListener, [Application]>[]> {
        return [];
    }

    protected services(): Awaitable<Class<Service, [Application]>[]> {
        return [];
    }

    public guildConfig(): Awaitable<
        | {
              [K in PropertyKey]: ZodSchema<unknown>;
          }
        | null
    > {
        return null;
    }

    public systemConfig(): Awaitable<
        | {
              [K in PropertyKey]: ZodSchema<unknown>;
          }
        | null
    > {
        return null;
    }

    public async register() {
        const commands = await this.commands();
        const events = await this.events();
        const services = await this.services();

        for (const command of commands) {
            await this.application.classLoader.loadCommandClass(command);
        }

        for (const event of events) {
            this.manager.loadEventClass(this.id, event).catch(this.application.logger.error);
        }

        for (const service of services) {
            this.serviceManager.loadServiceClass(service).catch(this.application.logger.error);
        }
    }
}
