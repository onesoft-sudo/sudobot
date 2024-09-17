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

import { Collection } from "discord.js";
import type Application from "../app/Application";
import Bind from "../container/Bind";
import Container from "../container/Container";
import FileSystem from "../polyfills/FileSystem";
import { requireNonNull } from "../utils/utils";
import { Service } from "./Service";

type ServiceConstructor = new (client: Application) => Service;

export type DiscordKernelClass = {
    services: string[];
    aliases: Record<string, string>;
};

declare global {
    interface ServiceRecord extends Record<string, object> {}
}

export type ServiceName = Extract<keyof ServiceRecord, string>;

@Bind("serviceManager")
class ServiceManager {
    protected readonly application: Application;

    public constructor(
        application: Application,
        protected readonly kernelClass: DiscordKernelClass
    ) {
        this.application = application;
    }

    private readonly services = new Collection<ServiceConstructor, Service>();
    private readonly servicesMappedByName = new Collection<string, Service>();

    public async loadServices() {
        requireNonNull(this.application);

        for (const service of this.kernelClass.services) {
            let servicePath = service;

            for (const alias in this.kernelClass.aliases) {
                servicePath = servicePath.replace(
                    `@${alias}`,
                    this.kernelClass.aliases[alias as keyof typeof this.kernelClass.aliases]
                );
            }

            if (
                !(await FileSystem.exists(servicePath + ".ts")) &&
                !(await FileSystem.exists(servicePath + ".js"))
            ) {
                this.application.logger.error(`Service not found: ${servicePath}`);
                continue;
            }

            await this.loadService(servicePath, service);
        }
    }

    public async loadServiceClass(
        ServiceClass: ServiceConstructor,
        name?: string,
        servicePath?: string
    ) {
        this.application.logger.debug(
            `Loading service: ${name ?? ServiceClass.name}` +
                (servicePath ? ` (${servicePath})` : "")
        );

        const instance = new ServiceClass(this.application);
        const key =
            Reflect.getMetadata("service:name", ServiceClass.prototype) ??
            Reflect.getMetadata("di:bind_as", ServiceClass.prototype) ??
            ServiceClass.name;

        Container.getInstance().bind(ServiceClass, {
            factory: () => instance,
            singleton: true,
            key
        });

        Container.getInstance().resolveProperties(ServiceClass, instance);

        this.services.set(ServiceClass, instance);
        this.servicesMappedByName.set(key, instance);
        await instance.boot();
        this.application.classLoader.loadEventsFromMetadata(instance, true);
        this.application.logger.info(
            `Loaded service: ${name ?? ServiceClass.name} (bound as ${key})`
        );
    }

    public async loadService(servicePath: string, name?: string) {
        const { default: ServiceClass }: { default: ServiceConstructor } = await import(
            servicePath
        );

        await this.loadServiceClass(ServiceClass, name, servicePath);
    }

    public loadServicesFromDirectory(servicesDirectory: string) {
        return this.application.classLoader.loadServicesFromDirectory(servicesDirectory);
    }

    public getService<S extends new () => Service>(serviceClass: S): InstanceType<S> {
        return this.services.get(serviceClass) as InstanceType<S>;
    }

    public getServiceByName<N extends ServiceName>(name: N): ServiceRecord[N] {
        return this.servicesMappedByName.get(name) as ServiceRecord[N];
    }
}

export { ServiceManager };
