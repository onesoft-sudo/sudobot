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

import { lstatSync } from "fs";
import { readdir } from "fs/promises";
import { join } from "path";
import { log, logInfo, logWarn } from "../utils/logger";
import Client from "./Client";
import Service from "./Service";

export default class ServiceManager {
    constructor(protected client: Client) {}

    async loadServices() {
        for (const service of this.client.services) {
            let replacedService = service;

            for (const alias in this.client.aliases) {
                replacedService = replacedService.replace(alias, this.client.aliases[alias as keyof typeof this.client.aliases]);
            }

            logInfo("Loading service: ", service);

            const { default: Service, name } = await import(replacedService);
            const serviceInstance = new Service(this.client);
            this.client[name as "services"] = serviceInstance;
            this.client.loadEventListenersFromMetadata(Service, serviceInstance);
            await serviceInstance.boot();
        }
    }

    async loadServiceFromFile(path: string, extension?: string) {
        const {
            default: Service,
            name
        }: {
            name?: string;
            default: new (client: Client) => Service;
        } = await import(path);

        if (!name && extension) {
            logWarn(
                `Extension ${extension} has attempted to load a service that does not export a \`name\` constant. (file: ${path})`
            );
            return false;
        }

        if (extension) {
            logInfo("Loading service: ", `${extension}:@services/${name}`);
        } else {
            logInfo("Loading service: ", `@services/${name ?? path}`);
        }

        const service = new Service(this.client);

        this.client[name as "services"] = service as any;
        this.client.loadEventListenersFromMetadata(Service, service);

        await service.boot();
        return true;
    }

    async loadServiceFromDirectory(path: string) {
        const files = await readdir(path);

        for (const file of files) {
            const filePath = join(path, file);

            if (lstatSync(filePath).isDirectory()) {
                await this.loadServiceFromDirectory(filePath);
                continue;
            }

            if (file.endsWith(".d.ts")) {
                continue;
            }

            if (file.endsWith(".js") || file.endsWith(".ts")) {
                log("Attempting to load service from file: ", filePath);
                await this.loadServiceFromFile(filePath);
            }
        }
    }
}
