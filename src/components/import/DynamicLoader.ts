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

import { Awaitable } from "discord.js";
import { Router } from "express";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import type Client from "../../core/Client";
import ConfigurationManager from "../../services/ConfigurationManager";
import APIServer from "../api/APIServer";
import Controller from "../api/http/Controller";
import Container from "../container/Container";
import EventListener from "../events/EventListener";
import { EventListenerInfo } from "../events/GatewayEventListener";
import { ClientEvents } from "../utils/ClientEvents";
import { AnyFunction, Class, DefaultExport } from "../utils/Utils";

class DynamicLoader {
    protected readonly eventHandlers = new WeakMap<
        object,
        Record<keyof ClientEvents, AnyFunction[]>
    >();

    public constructor(protected readonly client: Client) {}

    private getContainer() {
        return Container.getGlobalContainer();
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

    async loadControllers(router: Router) {
        const controllerFiles = await this.iterateDirectoryRecursively(
            path.resolve(__dirname, "../../api/controllers")
        );

        for (const file of controllerFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.loadController(file, router);
        }
    }

    async loadController(filepath: string, router: Router) {
        const { default: ControllerClass }: DefaultExport<Class<Controller, [Client]>> =
            await import(filepath);
        const controller = await Container.getGlobalContainer().resolve(ControllerClass);
        this.client.getService(APIServer).loadController(controller, ControllerClass, router);
        this.client.logger.info("Loaded Controller: ", ControllerClass.name);
    }

    async loadEvents(directory = path.resolve(__dirname, "../events")) {
        const eventListenerFiles = await this.iterateDirectoryRecursively(directory);

        for (const file of eventListenerFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.loadEvent(file);
        }
    }

    async loadEvent(filepath: string) {
        const { default: EventListenerClass }: DefaultExport<Class<EventListener, [Client]>> =
            await import(filepath);
        const listener = await this.getContainer().resolve(EventListenerClass);
        this.client.addEventListener(listener.name, listener.execute.bind(listener));
        this.client.logger.info("Loaded Event: ", listener.name);
    }

    async loadServicesFromDirectory(servicesDirectory = path.resolve(__dirname, "../services")) {
        const serviceFiles = await this.iterateDirectoryRecursively(servicesDirectory);

        for (const file of serviceFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.client.serviceManager.loadService(file);
        }
    }

    flattenCommandGroups() {
        const groups = this.client.getService(ConfigurationManager).systemConfig.commands.groups;
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

    async loadCommands(
        commandsDirectory = path.resolve(__dirname, "../commands"),
        loadMetadata: boolean = true,
        filter?: (path: string, name: string) => Awaitable<boolean>
    ) {
        const commandFiles = await this.iterateDirectoryRecursively(commandsDirectory);
        const groups = this.flattenCommandGroups();

        for (const file of commandFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            if (filter && !(await filter(file, path.basename(file)))) {
                continue;
            }

            await this.loadCommand(file, loadMetadata, groups);
        }
    }

    async loadCommand(
        filepath: string,
        loadMetadata = true,
        groups: Record<string, string> | null = null
    ) {
        throw new Error("Not ready");
        // const { default: CommandClass }: DefaultExport<Class<Command, [Client]>> = await import(
        //     filepath
        // );
        // const command = new CommandClass(this.client);
        // const previousCommand = this.client.commands.get(command.name);
        // let aliasGroupSet = false;

        // if (loadMetadata && previousCommand) {
        //     await this.unloadEventsFromMetadata(previousCommand);
        // }

        // this.client.commands.set(command.name, command);

        // for (const alias of command.aliases) {
        //     this.client.commands.set(alias, command);

        //     if (groups?.[alias] && !aliasGroupSet) {
        //         command.group = groups?.[alias];
        //         aliasGroupSet = true;
        //     }
        // }

        // if (!aliasGroupSet || groups?.[command.name]) {
        //     command.group = groups?.[command.name] ?? basename(dirname(filepath));
        // }

        // if (loadMetadata) {
        //     await this.loadEventsFromMetadata(command);
        // }

        // this.client.logger.info("Loaded Command: ", command.name);
    }

    async loadEventsFromMetadata(object: object, accessConstructor = true) {
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

            this.client.addEventListener(listenerInfo.event as keyof ClientEvents, handler);
        }

        this.eventHandlers.set(object, handlerData);

        if (metadata.eventListeners) {
            this.client.logger.debug(
                `Registered ${metadata.eventListeners?.length ?? 0} event listeners`
            );
        }
    }

    async unloadEventsFromMetadata(object: object) {
        const handlerData =
            this.eventHandlers.get(object) ?? ({} as Record<keyof ClientEvents, AnyFunction[]>);
        let count = 0;

        for (const event in handlerData) {
            for (const callback of handlerData[event as keyof typeof handlerData]) {
                this.client.removeEventListener(
                    event as keyof ClientEvents,
                    callback as (...args: ClientEvents[keyof ClientEvents]) => unknown
                );
            }

            count += handlerData[event as keyof typeof handlerData].length;
        }

        this.client.logger.debug(`Unloaded ${count} event listeners`);
    }
}

export default DynamicLoader;
