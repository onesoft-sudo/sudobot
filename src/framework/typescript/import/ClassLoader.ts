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

import type { CommandManagerServiceInterface } from "@framework/contracts/CommandManagerServiceInterface";
import type { ConfigurationManagerServiceInterface } from "@framework/contracts/ConfigurationManagerServiceInterface";
import type { Awaitable } from "discord.js";
import type { Router } from "express";
import { lstat, readdir } from "node:fs/promises";
import path, { basename, dirname } from "node:path";
import type Controller from "../api/http/Controller";
import Application from "../app/Application";
import type { Command } from "../commands/Command";
import Container from "../container/Container";
import type EventListener from "../events/EventListener";
import type { EventListenerInfo } from "../events/GatewayEventListener";
import { File } from "../io/File";
import type { Permission } from "../permissions/Permission";
import type Queue from "../queues/Queue";
import type { ClientEvents } from "../types/ClientEvents";
import type { AnyFunction, Class, DefaultExport } from "../types/Utils";
import InvalidClassFileError from "./InvalidClassFileError";
import NoClassDefFoundError from "./NoClassDefFoundError";

class ClassLoader {
    protected readonly eventHandlers = new WeakMap<
        object,
        Record<keyof ClientEvents, AnyFunction[]>
    >();
    private static instance: ClassLoader;
    private readonly modules: string[] = [];

    private constructor(protected readonly application: Application) {}

    public static getInstance(application: Application) {
        if (!ClassLoader.instance) {
            ClassLoader.instance = new ClassLoader(application);
        }

        return ClassLoader.instance;
    }

    private getContainer() {
        return Container.getInstance();
    }

    private async iterateDirectoryRecursively(
        root: string,
        rootArray?: string[]
    ) {
        const filesAndDirectories = await readdir(root);
        const files: string[] = [];

        for (const file of filesAndDirectories) {
            const filepath = path.resolve(root, file);
            const stat = await lstat(filepath);

            if (stat.isDirectory()) {
                await this.iterateDirectoryRecursively(
                    filepath,
                    rootArray ?? files
                );
                continue;
            }

            (rootArray ?? files).push(filepath);
        }

        return files;
    }

    public static getSystemClassLoader() {
        if (!this.instance) {
            this.instance = new ClassLoader(
                Container.getInstance().resolveByClass(Application)
            );
        }

        return this.instance;
    }

    private async loadModules() {
        if (this.modules.length > 0) {
            return this.modules;
        }

        const srcDir = path.resolve(
            this.application.projectRootPath,
            process.isBun ? "src" : "out"
        );
        const modules = await readdir(srcDir);

        for (const module of modules) {
            if (module.startsWith(".")) {
                continue;
            }

            const stat = await lstat(path.resolve(srcDir, module));

            if (!stat.isDirectory()) {
                continue;
            }

            this.modules.push(basename(module));
        }

        return modules;
    }

    public async getResource(name: string, module?: string) {
        const modules = module ? [module] : await this.loadModules();

        for (const moduleName of modules) {
            const filePath = path.join(
                this.application.projectRootPath,
                process.isBun ? "src" : "out",
                moduleName,
                "resources/",
                name
            );
            const file = File.of(filePath);

            if (!file.exists) {
                continue;
            }

            return file;
        }

        return null;
    }

    public async loadClass(resolvable: File | string): Promise<Class<unknown>> {
        const classPath =
            typeof resolvable === "string" ? resolvable : resolvable.path;

        if (!classPath.endsWith(".ts") && !classPath.endsWith(".js")) {
            throw new InvalidClassFileError(
                "Class file must be a TypeScript or JavaScript file"
            );
        }

        const { default: classObject } = (await import(
            classPath
        )) as DefaultExport<Class<unknown>>;

        if (!classObject) {
            throw new NoClassDefFoundError("No class definition found in file");
        }

        return classObject;
    }

    public async loadClassesFromDirectory(
        directory: string
    ): Promise<Array<Class<unknown>>> {
        const classFiles = await this.iterateDirectoryRecursively(directory);
        const results = [];

        for (const file of classFiles) {
            if (
                (!file.endsWith(".ts") && !file.endsWith(".js")) ||
                file.endsWith(".d.ts")
            ) {
                continue;
            }

            results.push(await this.loadClass(file));
        }

        return results;
    }

    public async loadControllers(
        router: Router,
        directory = path.resolve(__dirname, "../../api/controllers")
    ) {
        const controllerFiles = await this.iterateDirectoryRecursively(
            directory ?? path.resolve(__dirname, "../../api/controllers")
        );

        for (const file of controllerFiles) {
            if (
                (!file.endsWith(".ts") && !file.endsWith(".js")) ||
                file.endsWith(".d.ts")
            ) {
                continue;
            }

            await this.loadController(file, router);
        }
    }

    public async loadController(filepath: string, router: Router) {
        const { default: ControllerClass } = (await import(
            filepath
        )) as DefaultExport<Class<Controller, [Application]>>;
        const controller =
            Container.getInstance().resolveByClass(ControllerClass);
        this.loadEventsFromMetadata(controller, true);
        this.application
            .service("apiServer")
            .loadController(controller, ControllerClass, router);
        this.application.logger.info(
            "Loaded Controller: ",
            ControllerClass.name
        );
    }

    public async loadEvents(directory = path.resolve(__dirname, "../events")) {
        const eventListenerFiles =
            await this.iterateDirectoryRecursively(directory);

        for (const file of eventListenerFiles) {
            if (
                (!file.endsWith(".ts") && !file.endsWith(".js")) ||
                file.endsWith(".d.ts")
            ) {
                continue;
            }

            await this.loadEvent(file);
        }
    }

    public async loadEvent(filepath: string) {
        const { default: EventListenerClass } = (await import(
            filepath
        )) as DefaultExport<Class<EventListener, [Application]>>;
        const listener = this.getContainer().resolveByClass(EventListenerClass);
        await listener.onInitialize?.();
        this.application
            .getClient()
            .addEventListener(listener.name, listener.execute.bind(listener));
        this.application.logger.info("Loaded Event: ", listener.name);
    }

    public async loadPermissions(
        directory = path.resolve(__dirname, "../permissions")
    ) {
        const eventListenerFiles =
            await this.iterateDirectoryRecursively(directory);

        for (const file of eventListenerFiles) {
            if (
                (!file.endsWith(".ts") && !file.endsWith(".js")) ||
                file.endsWith(".d.ts")
            ) {
                continue;
            }

            await this.loadPermission(file);
        }
    }

    public async loadPermission(filepath: string) {
        const { default: PermissionClass } = (await import(
            filepath
        )) as DefaultExport<typeof Permission>;
        const permission = await PermissionClass.getInstance<Permission>();
        this.application.serviceManager
            .getServiceByName("permissionManager")
            .loadPermission(permission);
        this.application.logger.info(
            "Loaded Permission Handler: ",
            permission.toString()
        );
    }

    public async loadServicesFromDirectory(
        servicesDirectory = path.resolve(__dirname, "../services")
    ) {
        const serviceFiles =
            await this.iterateDirectoryRecursively(servicesDirectory);

        for (const file of serviceFiles) {
            if (
                (!file.endsWith(".ts") && !file.endsWith(".js")) ||
                file.endsWith(".d.ts")
            ) {
                continue;
            }

            await this.application.serviceManager.loadService(file);
        }
    }

    private get configManager() {
        return this.application.service(
            "configManager"
        ) as ConfigurationManagerServiceInterface;
    }

    private get commandManager() {
        return this.application.service(
            "commandManager"
        ) as CommandManagerServiceInterface;
    }

    public flattenCommandGroups() {
        const groups = this.configManager.systemConfig.commands
            .groups as Record<string, string[]>;

        const groupNames = Object.keys(groups);

        if (groupNames.length === 0) {
            return null;
        }

        const flatten: Record<string, string> = {};

        for (const groupName of groupNames) {
            for (const commandName of groups[groupName]) {
                flatten[commandName] = groupName;
            }
        }

        return flatten;
    }

    public async loadCommands(
        commandsDirectory = path.resolve(__dirname, "../../commands"),
        loadMetadata: boolean = true,
        filter?: (path: string, name: string) => Awaitable<boolean>
    ) {
        const commandFiles =
            await this.iterateDirectoryRecursively(commandsDirectory);
        const groups = this.flattenCommandGroups();
        const commandManager = this.commandManager;

        for (const file of commandFiles) {
            if (
                (!file.endsWith(".ts") && !file.endsWith(".js")) ||
                file.endsWith(".d.ts")
            ) {
                continue;
            }

            if (filter && !(await filter(file, path.basename(file)))) {
                continue;
            }

            await this.loadCommand(file, loadMetadata, groups, commandManager);
        }
    }

    public async loadCommand(
        filepath: string,
        loadMetadata = true,
        groups: Record<string, string> | null = null,
        commandManager: CommandManagerServiceInterface = this.commandManager
    ) {
        const { default: CommandClass } = (await import(
            filepath
        )) as DefaultExport<Class<Command, [Application]>>;
        await this.loadCommandClass(
            CommandClass,
            filepath,
            loadMetadata,
            groups,
            commandManager
        );
    }

    public async loadCommandClass(
        CommandClass: Class<Command, [Application]>,
        filepath?: string,
        loadMetadata = true,
        groups: Record<string, string> | null = null,
        commandManager: CommandManagerServiceInterface = this.commandManager
    ) {
        const canBind = Reflect.hasMetadata(
            "di:can-bind",
            CommandClass.prototype as object
        );
        const command = canBind
            ? this.getContainer().resolveByClass(CommandClass)
            : new CommandClass(this.application);

        if (!canBind) {
            this.getContainer().resolveProperties(CommandClass, command);
        }

        if (!command.initialized) {
            await command.initialize?.();
        }

        if (filepath) {
            command.setFile(filepath);
        }

        const defaultGroup = filepath ? basename(dirname(filepath)) : undefined;
        await commandManager.addCommand(
            command,
            loadMetadata,
            groups,
            defaultGroup
        );
        this.application.logger.info("Loaded Command: ", command.name);
    }

    public async loadQueueClasses(
        directory = path.resolve(__dirname, "../../queues")
    ) {
        this.application.service("queueService").onBeforeQueueRegister();
        const queueFiles = await this.iterateDirectoryRecursively(directory);

        for (const file of queueFiles) {
            if (
                (!file.endsWith(".ts") && !file.endsWith(".js")) ||
                file.endsWith(".d.ts")
            ) {
                continue;
            }

            await this.loadQueueClass(file);
        }
    }

    public async loadQueueClass(filepath: string) {
        const { default: QueueClass } = (await import(
            filepath
        )) as DefaultExport<typeof Queue>;
        this.application.service("queueService").register(QueueClass);
        this.application.logger.info("Loaded Queue: ", QueueClass.uniqueName);
    }

    public loadEventsFromMetadata(object: object, accessConstructor = true) {
        const finalObject = accessConstructor ? object.constructor : object;
        const metadata =
            Symbol.metadata in finalObject
                ? (finalObject[Symbol.metadata] as {
                      eventListeners?: EventListenerInfo[];
                  })
                : {
                      eventListeners: Reflect.getMetadata(
                          "event_listeners",
                          (finalObject as { prototype: object }).prototype
                      ) as EventListenerInfo[]
                  };

        const handlerData =
            this.eventHandlers.get(object) ??
            ({} as Record<keyof ClientEvents, AnyFunction[]>);

        for (const listenerInfo of metadata.eventListeners ?? []) {
            const callback = object[
                listenerInfo.methodName as unknown as keyof typeof object
            ] as AnyFunction;
            const handler = callback.bind(object);
            handlerData[listenerInfo.event] ??= [] as AnyFunction[];
            handlerData[listenerInfo.event].push(handler);

            this.application
                .getClient()
                .addEventListener(listenerInfo.event, handler);
        }

        this.eventHandlers.set(object, handlerData);

        if (metadata.eventListeners) {
            this.application.logger.debug(
                `Registered ${metadata.eventListeners?.length ?? 0} event listeners`
            );
        }
    }

    public unloadEventsFromMetadata(object: object) {
        const handlerData =
            this.eventHandlers.get(object) ??
            ({} as Record<keyof ClientEvents, AnyFunction[]>);
        let count = 0;

        for (const event in handlerData) {
            for (const callback of handlerData[
                event as keyof typeof handlerData
            ]) {
                this.application
                    .getClient()
                    .removeEventListener(
                        event as keyof ClientEvents,
                        callback as (
                            ...args: ClientEvents[keyof ClientEvents]
                        ) => unknown
                    );
            }

            count += handlerData[event as keyof typeof handlerData].length;
        }

        this.application.logger.debug(`Unloaded ${count} event listeners`);
    }
}

export default ClassLoader;
