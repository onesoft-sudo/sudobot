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

import type Application from "@framework/app/Application";
import Service from "./Service";
import type { DefaultExport } from "@framework/types/Utils";
import { Collection } from "discord.js";
import { Logger } from "@framework/log/Logger";
import { requireNonNull } from "@framework/utils/utils";
import type { ConstructorOf } from "@framework/container/Container";

class ServiceManager {
    public readonly application: Application;
    public readonly services = new Collection<string | object, Service>();
    public readonly logger = Logger.getLogger(ServiceManager);

    public constructor(application: Application) {
        this.application = application;
    }

    public async load(services: readonly string[], aliases: Readonly<Record<string, string>> = {}) {
        for (const service of services) {
            this.logger.debug("Loading service: ", service);

            let servicePath = service;

            for (const alias in aliases) {
                servicePath = servicePath.replaceAll(`@${alias}`, aliases[alias]);
            }

            const { default: ServiceClass } =
                await this.application.classLoader.loadClass<DefaultExport<new (application: Application) => Service>>(
                    servicePath
                );

            const serviceInstance = this.application.container.get(ServiceClass, {
                constructorArgs: [this.application]
            });

            if (!(serviceInstance instanceof Service)) {
                throw new TypeError("Service " + ServiceClass.name + " does not extend Service base class");
            }

            this.services.set(serviceInstance.name, serviceInstance);
            this.services.set(ServiceClass, serviceInstance);
            this.application.container.register({
                type: ServiceClass,
                factory: () => serviceInstance,
                singleton: true,
                id: serviceInstance.name
            });

            await serviceInstance.boot?.();
            this.logger.info("Loaded service: ", service, " (" + ServiceClass.name + ")");
        }
    }

    public get<T extends Service>(service: ConstructorOf<T>): T;
    public get<T extends Service>(name: string): T;

    public get<T extends Service>(service: ConstructorOf<T> | string): T {
        return requireNonNull(this.services.get(service), "Service could not be resolved") as T;
    }
}

export default ServiceManager;
