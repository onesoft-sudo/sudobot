/*
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

import { CommandManagerServiceInterface } from "@framework/contracts/CommandManagerServiceInterface";
import { ConfigurationManagerServiceInterface } from "@framework/contracts/ConfigurationManagerServiceInterface";
import { Awaitable } from "discord.js";
import { Router } from "express";
import { lstat, readdir } from "node:fs/promises";
import path, { basename, dirname } from "node:path";
import APIServer from "../api/APIServer";
import Controller from "../api/http/Controller";
import Application from "../app/Application";
import { Command } from "../commands/Command";
import Container from "../container/Container";
import EventListener from "../events/EventListener";
import { EventListenerInfo } from "../events/GatewayEventListener";
import { File } from "../io/File";
import { Permission } from "../permissions/Permission";
import Queue from "../queues/Queue";
import { ClientEvents } from "../types/ClientEvents";
import { AnyFunction, Class, DefaultExport } from "../types/Utils";
import InvalidClassFileError from "./InvalidClassFileError";
import NoClassDefFoundError from "./NoClassDefFoundError";

class ClassLoader {
    protected readonly eventHandlers = new WeakMap<
        object,
        Record<keyof ClientEvents, AnyFunction[]>
    >();
    private static instance: ClassLoader;

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

    private async iterateDirectoryRecursively(root: string, rootArray?: string[]) {
        const filesAndDirectories = await readdir(root);
        const files: string[] = [];

        for (const file of filesAndDirectories) {
            const filepath = path.resolve(root, file);
            const stat = await lstat(filepath);

            if (stat.isDirectory()) {
                await this.iterateDirectoryRecursively(filepath, rootArray ?? files);
                continue;
            }

            (rootArray ?? files).push(filepath);
        }

        return files;
    }

    public static getSystemClassLoader() {
        if (!this.instance) {
            this.instance = new ClassLoader(Container.getInstance().resolveByClass(Application));
        }

        return this.instance;
    }

    public getResource(name: string) {
        const filePath = path.resolve(this.application.rootPath, "../../resources/", name);
        const file = File.of(filePath);

        if (!file.exists) {
            return null;
        }

        return file;
    }

    /**
     * Load a class from a file.
     *
     * @param resolvable The file to load the class from.
     * @returns {Promise<Class<unknown>>} The class object.
     * @throws {InvalidClassFileError} If the file is not a TypeScript or JavaScript file.
     * @throws {NoClassDefFoundError} If no class definition is found in the file.
     */
    public async loadClass(resolvable: File | string): Promise<Class<unknown>> {
        const classPath = typeof resolvable === "string" ? resolvable : resolvable.path;

        if (!classPath.endsWith(".ts") && !classPath.endsWith(".js")) {
            throw new InvalidClassFileError("Class file must be a TypeScript or JavaScript file");
        }

        const { default: classObject }: DefaultExport<Class<unknown>> = await import(classPath);

        if (!classObject) {
            throw new NoClassDefFoundError("No class definition found in file");
        }

        return classObject;
    }

    /**
     * Load all classes from a directory.
     *
     * @param directory The directory to load classes from.
     * @returns {Promise<Array<Class<unknown>>>} An array of class objects.
     * @throws {InvalidClassFileError} If a file is not a TypeScript or JavaScript file.
     * @throws {NoClassDefFoundError} If no class definition is found in a file.
     */
    public async loadClassesFromDirectory(directory: string): Promise<Array<Class<unknown>>> {
        const classFiles = await this.iterateDirectoryRecursively(directory);
        const results = [];

        for (const file of classFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
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
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.loadController(file, router);
        }
    }

    public async loadController(filepath: string, router: Router) {
        const { default: ControllerClass }: DefaultExport<Class<Controller, [Application]>> =
            await import(filepath);
        const controller = Container.getInstance().resolveByClass(ControllerClass);
        this.loadEventsFromMetadata(controller, true);
        this.application.getService(APIServer).loadController(controller, ControllerClass, router);
        this.application.logger.info("Loaded Controller: ", ControllerClass.name);
    }

    public async loadEvents(directory = path.resolve(__dirname, "../events")) {
        const eventListenerFiles = await this.iterateDirectoryRecursively(directory);

        for (const file of eventListenerFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.loadEvent(file);
        }
    }

    public async loadEvent(filepath: string) {
        const { default: EventListenerClass }: DefaultExport<Class<EventListener, [Application]>> =
            await import(filepath);
        const listener = this.getContainer().resolveByClass(EventListenerClass);
        await listener.onInitialize?.();
        this.application
            .getClient()
            .addEventListener(listener.name, listener.execute.bind(listener));
        this.application.logger.info("Loaded Event: ", listener.name);
    }

    public async loadPermissions(directory = path.resolve(__dirname, "../permissions")) {
        const eventListenerFiles = await this.iterateDirectoryRecursively(directory);

        for (const file of eventListenerFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.loadPermission(file);
        }
    }

    public async loadPermission(filepath: string) {
        const { default: PermissionClass }: DefaultExport<typeof Permission> = await import(
            filepath
        );
        const permission = await PermissionClass.getInstance<Permission>();
        this.application.serviceManager
            .getServiceByName("permissionManager")
            .loadPermission(permission);
        this.application.logger.info("Loaded Permission Handler: ", permission.toString());
    }

    public async loadServicesFromDirectory(
        servicesDirectory = path.resolve(__dirname, "../services")
    ) {
        const serviceFiles = await this.iterateDirectoryRecursively(servicesDirectory);

        for (const file of serviceFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.application.serviceManager.loadService(file);
        }
    }

    private get configManager() {
        return this.application.getServiceByName(
            "configManager"
        ) as ConfigurationManagerServiceInterface;
    }

    private get commandManager() {
        return this.application.getServiceByName(
            "commandManager"
        ) as CommandManagerServiceInterface;
    }

    public flattenCommandGroups() {
        const groups = this.configManager.systemConfig.commands.groups;
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
        const commandFiles = await this.iterateDirectoryRecursively(commandsDirectory);
        const groups = this.flattenCommandGroups();
        const commandManager = this.commandManager;

        for (const file of commandFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
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
        const { default: CommandClass }: DefaultExport<Class<Command, [Application]>> =
            await import(filepath);
        const canBind = Reflect.hasMetadata("di:can-bind", CommandClass.prototype);
        const command = canBind
            ? this.getContainer().resolveByClass(CommandClass)
            : new CommandClass(this.application);

        if (!canBind) {
            this.getContainer().resolveProperties(CommandClass, command);
        }

        const defaultGroup = basename(dirname(filepath));
        await commandManager.addCommand(command, loadMetadata, groups, defaultGroup);
        this.loadEventsFromMetadata(command, true);

        this.application.logger.info("Loaded Command: ", command.name);
    }

    public async loadQueueClasses(directory = path.resolve(__dirname, "../../queues")) {
        this.application.getServiceByName("queueService").onBeforeQueueRegister();
        const queueFiles = await this.iterateDirectoryRecursively(directory);

        for (const file of queueFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.loadQueueClass(file);
        }
    }

    public async loadQueueClass(filepath: string) {
        const { default: QueueClass }: DefaultExport<typeof Queue> = await import(filepath);
        this.application.getServiceByName("queueService").register(QueueClass);
        this.application.logger.info("Loaded Queue: ", QueueClass.uniqueName);
    }

    public loadEventsFromMetadata(object: object, accessConstructor = true) {
        const finalObject = accessConstructor ? object.constructor : object;
        const metadata =
            Symbol.metadata in finalObject
                ? (finalObject[Symbol.metadata] as { eventListeners?: EventListenerInfo[] })
                : {
                      eventListeners: Reflect.getMetadata(
                          "event_listeners",
                          (finalObject as { prototype: object }).prototype
                      )
                  };

        const handlerData =
            this.eventHandlers.get(object) ?? ({} as Record<keyof ClientEvents, AnyFunction[]>);

        for (const listenerInfo of metadata.eventListeners ?? []) {
            const callback = object[
                listenerInfo.methodName as unknown as keyof typeof object
            ] as AnyFunction;
            const handler = callback.bind(object);
            handlerData[listenerInfo.event as keyof typeof handlerData] ??= [] as AnyFunction[];
            handlerData[listenerInfo.event as keyof typeof handlerData].push(handler);

            this.application
                .getClient()
                .addEventListener(listenerInfo.event as keyof ClientEvents, handler);
        }

        this.eventHandlers.set(object, handlerData);

        if (metadata.eventListeners) {
            this.application.logger.debug(
                `Registered ${metadata.eventListeners?.length ?? 0} event listeners`
            );
        }
    }

    public async unloadEventsFromMetadata(object: object) {
        const handlerData =
            this.eventHandlers.get(object) ?? ({} as Record<keyof ClientEvents, AnyFunction[]>);
        let count = 0;

        for (const event in handlerData) {
            for (const callback of handlerData[event as keyof typeof handlerData]) {
                this.application
                    .getClient()
                    .removeEventListener(
                        event as keyof ClientEvents,
                        callback as (...args: ClientEvents[keyof ClientEvents]) => unknown
                    );
            }

            count += handlerData[event as keyof typeof handlerData].length;
        }

        this.application.logger.debug(`Unloaded ${count} event listeners`);
    }
}

export default ClassLoader;
