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

import { Class, DefaultExport } from "../types/Utils";
import { logInfo } from "../utils/Logger";
import type Client from "./Client";
import Service from "./Service";

export default class ServiceManager {
    constructor(protected readonly client: Client) {}

    async loadServices() {
        const serviceFiles = this.client.services.map(service => {
            let filepath = service;

            for (const alias in this.client.aliases) {
                filepath = filepath.replaceAll(`@${alias}`, this.client.aliases[alias as keyof typeof this.client.aliases]);
            }

            return filepath;
        });

        for (const file of serviceFiles) {
            await this.loadService(file);
        }
    }

    async loadService(filepath: string) {
        const { default: ServiceClass, name }: DefaultExport<Class<Service, [Client]>> & { name?: string } = await import(
            filepath
        );

        if (!name) {
            throw new Error(`Name is empty for service ${filepath}`);
        }

        const previousServiceInstance = this.client[name as "startupManager"];
        const service = new ServiceClass(this.client);

        if (previousServiceInstance) {
            logInfo(`Previous instance of service ${name} found. Deactivating`);
            await this.client.dynamicLoader.unloadEventsFromMetadata(previousServiceInstance);
            await previousServiceInstance.deactivate();
        }

        this.client[name as "startupManager"] = service as (typeof this.client)["startupManager"];
        await this.client.dynamicLoader.loadEventsFromMetadata(service);
        await service.boot();

        logInfo(`${previousServiceInstance ? "Rel" : "L"}oaded Service: `, name);
    }

    loadServiceFromDirectory(servicesDirectory: string) {
        return this.client.dynamicLoader.loadServiceFromDirectory(servicesDirectory);
    }
}
