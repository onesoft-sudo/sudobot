import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
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
            if (!file.endsWith(".ts") && !file.endsWith(".js")) {
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

    async loadCommands() {
        const commandFiles = await this.iterateDirectoryRecursively(path.resolve(__dirname, "../commands"));

        for (const file of commandFiles) {
            if (!file.endsWith(".ts") && !file.endsWith(".js")) {
                continue;
            }

            await this.loadCommand(file);
        }
    }

    async loadCommand(filepath: string) {
        const { default: CommandClass }: DefaultExport<Class<Command, [Client]>> = await import(filepath);
        const command = new CommandClass(this.client);

        this.client.commands.set(command.name, command);

        for (const alias of command.aliases) {
            this.client.commands.set(alias, command);
        }

        logInfo("Loaded Command: ", command.name);
    }
}

export default DynamicLoader;
