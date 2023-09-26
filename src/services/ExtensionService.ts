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

import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import Client from "../core/Client";
import { Extension } from "../core/Extension";
import Service from "../core/Service";
import { log, logError, logInfo } from "../utils/logger";

export const name = "extensionService";

type Metadata = {
    main?: string;
    commands?: string;
    events?: string;
    language?: "typescript" | "javascript";
    main_directory?: string;
    build_command?: string;
};

export default class ExtensionService extends Service {
    protected readonly extensionsPath = path.join(__dirname, "../../extensions");

    async boot() {
        if (!existsSync(this.extensionsPath)) {
            log("No extensions found");
            return;
        }

        const extensionsIndex = path.join(this.extensionsPath, "index.json");

        if (existsSync(extensionsIndex)) {
            await this.loadExtensionsFromIndex(extensionsIndex);
            return;
        }

        await this.loadExtensions();
    }

    async loadExtensionsFromIndex(extensionsIndex: string) {
        const { extensions } = JSON.parse(await fs.readFile(extensionsIndex, "utf-8"));

        for (const { entry, commands, events, name } of extensions) {
            logInfo("Loading extension (cached): ", name);

            await this.loadExtension({
                extensionPath: entry,
                commands,
                events
            });
        }
    }

    async loadExtensions() {
        const extensions = await fs.readdir(this.extensionsPath);

        for (const extensionName of extensions) {
            const extensionDirectory = path.resolve(this.extensionsPath, extensionName);
            const isDirectory = (await fs.lstat(extensionDirectory)).isDirectory();

            if (!isDirectory) {
                continue;
            }

            logInfo("Loading extension: ", extensionName);
            const metadataFile = path.join(extensionDirectory, "extension.json");

            if (!existsSync(metadataFile)) {
                logError(`Extension ${extensionName} does not have a "extension.json" file!`);
                process.exit(-1);
            }

            const metadata: Metadata = JSON.parse(await fs.readFile(metadataFile, { encoding: "utf-8" }));
            const {
                main_directory = "./build",
                commands = `./${main_directory}/commands`,
                events = `./${main_directory}/events`,
                main = `./${main_directory}/index.js`
            } = metadata;

            await this.loadExtension({
                extensionPath: path.join(extensionDirectory, main),
                commandsDirectory: path.join(extensionDirectory, commands),
                eventsDirectory: path.join(extensionDirectory, events)
            });
        }
    }

    async loadExtension({
        extensionPath,
        commandsDirectory,
        eventsDirectory,
        commands,
        events
    }:
        | {
              extensionPath: string;
              commandsDirectory: string;
              eventsDirectory: string;
              commands?: never;
              events?: never;
          }
        | {
              extensionPath: string;
              commandsDirectory?: never;
              eventsDirectory?: never;
              commands: string[];
              events: string[];
          }) {
        const { default: ExtensionClass }: { default: new (client: Client) => Extension } = await import(extensionPath);
        const extension = new ExtensionClass(this.client);
        const commandPaths = await extension.commands();
        const eventPaths = await extension.events();

        if (commandPaths === null) {
            if (commandsDirectory) {
                if (existsSync(commandsDirectory)) {
                    await this.client.loadCommands(commandsDirectory);
                }
            } else if (commands) {
                for (const commandPath of commands) {
                    await this.client.loadCommand(commandPath);
                }
            }
        } else {
            for (const commandPath of commandPaths) {
                await this.client.loadCommand(commandPath);
            }
        }

        if (eventPaths === null) {
            if (eventsDirectory) {
                if (existsSync(eventsDirectory)) {
                    await this.client.loadEvents(eventsDirectory);
                }
            } else if (events) {
                for (const eventPath of events) {
                    await this.client.loadEvent(eventPath);
                }
            }
        } else {
            for (const eventPath of eventPaths) {
                await this.client.loadEvent(eventPath);
            }
        }
    }
}
