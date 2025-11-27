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
import { BUNDLE_DATA_SYMBOL, type BundleData } from "@framework/utils/bundle";

class ServiceManager {
    public readonly application: Application;
    public readonly services = new Collection<string | object, Service>();
    public readonly logger = Logger.getLogger(ServiceManager);

    public constructor(application: Application) {
        this.application = application;
    }

    public load(services: readonly string[], aliases: Readonly<Record<string, string>> = {}) {
        if (BUNDLE_DATA_SYMBOL in global) {
            return this.loadFromBundle(services);
        }

        return this.loadFromList(services, aliases);
    }

    public async loadFromList(services: readonly string[], aliases: Readonly<Record<string, string>> = {}) {
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

            await this.loadInstance(service, ServiceClass);
        }
    }

    public async loadFromBundle(serviceNames: readonly string[]) {
        const services = Object.entries(
            BUNDLE_DATA_SYMBOL in global ? (global[BUNDLE_DATA_SYMBOL] as BundleData)?.services : {}
        ).sort(([a], [b]) => serviceNames.indexOf(a) - serviceNames.indexOf(b));

        for (const [service, serviceClass] of services) {
            this.logger.debug("Loading service: ", service);
            await this.loadInstance(service, serviceClass);
        }
    }

    protected async loadInstance(service: string, serviceClass: new (application: Application) => Service) {
        const serviceInstance = this.application.container.get(serviceClass, {
            constructorArgs: [this.application]
        });

        if (!(serviceInstance instanceof Service)) {
            throw new TypeError("Service " + serviceClass.name + " does not extend Service base class");
        }

        this.services.set(serviceInstance.name, serviceInstance);
        this.services.set(serviceClass, serviceInstance);
        this.application.container.register({
            type: serviceClass,
            factory: () => serviceInstance,
            singleton: true,
            id: serviceInstance.name
        });

        await serviceInstance.boot?.();
        this.logger.info("Loaded service: ", service, " (" + serviceClass.name + ")");
    }

    public get<T extends Service>(service: ConstructorOf<T>): T;
    public get<T extends Service>(name: string): T;

    public get<T extends Service>(service: ConstructorOf<T> | string): T {
        return requireNonNull(this.services.get(service), "Service could not be resolved") as T;
    }
}

export default ServiceManager;
