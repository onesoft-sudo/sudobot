import { Awaitable } from "discord.js";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { EventListenerInfo } from "../decorators/GatewayEventListener";
import { ClientEvents } from "../types/ClientEvents";
import { Class, DefaultExport } from "../types/Utils";
import { logInfo } from "../utils/logger";
import type Client from "./Client";
import Command from "./Command";
import EventListener from "./EventListener";
import Service from "./Service";

class DynamicLoader extends Service {
    async iterateDirectoryRecursively(root: string, rootArray?: string[]) {
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

    async loadEvents() {
        const eventListenerFiles = await this.iterateDirectoryRecursively(path.resolve(__dirname, "../events"));

        for (const file of eventListenerFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.loadEvent(file);
        }
    }

    async loadEvent(filepath: string) {
        const { default: EventListenerClass }: DefaultExport<Class<EventListener, [Client]>> = await import(filepath);
        const listener = new EventListenerClass(this.client);
        this.client.addEventListener(listener.name, listener.execute.bind(listener));
        logInfo("Loaded Event: ", listener.name);
    }

    async loadServiceFromDirectory(servicesDirectory = path.resolve(__dirname, "../services")) {
        const commandFiles = await this.iterateDirectoryRecursively(servicesDirectory);

        for (const file of commandFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.client.serviceManager.loadService(file);
        }
    }

    async loadCommands(
        commandsDirectory = path.resolve(__dirname, "../commands"),
        loadMetadata: boolean = true,
        filter?: (path: string, name: string) => Awaitable<boolean>
    ) {
        const commandFiles = await this.iterateDirectoryRecursively(commandsDirectory);

        for (const file of commandFiles) {
            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            if (filter && !(await filter(file, path.basename(file)))) {
                continue;
            }

            await this.loadCommand(file, loadMetadata);
        }
    }

    async loadCommand(filepath: string, loadMetadata = true) {
        const { default: CommandClass }: DefaultExport<Class<Command, [Client]>> = await import(filepath);
        const command = new CommandClass(this.client);

        this.client.commands.set(command.name, command);

        for (const alias of command.aliases) {
            this.client.commands.set(alias, command);
        }

        if (loadMetadata) {
            await this.loadEventsFromMetadata(command);
        }

        logInfo("Loaded Command: ", command.name);
    }

    async loadEventsFromMetadata(object: object, accessConstructor = true) {
        const finalObject = accessConstructor ? object.constructor : object;

        if (!(Symbol.metadata in finalObject)) {
            return;
        }

        const metadata = finalObject[Symbol.metadata] as { eventListeners?: EventListenerInfo[] };

        for (const listenerInfo of metadata.eventListeners ?? []) {
            this.client.addEventListener(
                listenerInfo.event as keyof ClientEvents,
                (object[listenerInfo.methodName as unknown as keyof typeof object] as Function).bind(object)
            );
        }

        if (metadata.eventListeners) {
            logInfo(`Registered ${metadata.eventListeners?.length ?? 0} event listeners`);
        }
    }
}

export default DynamicLoader;
