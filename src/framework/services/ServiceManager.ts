import { Collection } from "discord.js";
import type Client from "../../core/Client";
import DiscordKernel from "../../core/DiscordKernel";
import { ESModule } from "../../types/ESModule";
import { Services } from "../../types/Services";
import Bind from "../container/Bind";
import Container from "../container/Container";
import { Inject } from "../container/Inject";
import FileSystem from "../polyfills/FileSystem";
import { requireNonNull } from "../utils/utils";
import { Service } from "./Service";

type ServiceConstructor = new (client: Client) => Service;

@Bind("serviceManager")
class ServiceManager {
    @Inject("client")
    protected readonly client!: Client;

    private readonly services = new Collection<ServiceConstructor, Service>();
    private readonly servicesMappedByName = new Collection<string, Service>();

    public async loadServices() {
        requireNonNull(this.client);

        for (const service of DiscordKernel.services) {
            let servicePath = service;

            for (const alias in DiscordKernel.aliases) {
                servicePath = servicePath.replace(
                    `@${alias}`,
                    DiscordKernel.aliases[alias as keyof typeof DiscordKernel.aliases]
                );
            }

            if (
                !(await FileSystem.exists(servicePath + ".ts")) &&
                !(await FileSystem.exists(servicePath + ".js"))
            ) {
                this.client.logger.error(`Service not found: ${servicePath}`);
                continue;
            }

            await this.loadService(servicePath, service);
        }
    }

    public async loadService(servicePath: string, name?: string) {
        const { default: ServiceClass }: ESModule<ServiceConstructor> = await import(servicePath);
        const instance = new ServiceClass(this.client);

        Container.getGlobalContainer().bind(ServiceClass, {
            factory: () => instance,
            singleton: true
        });

        this.services.set(ServiceClass, instance);
        this.servicesMappedByName.set(
            Reflect.getMetadata("service:name", ServiceClass.prototype) ?? ServiceClass.name,
            instance
        );
        await instance.boot();
        this.client.logger.info(`Loaded service: ${name ?? ServiceClass.name}`);
    }

    public loadServicesFromDirectory(servicesDirectory: string) {
        return this.client.dynamicLoader.loadServicesFromDirectory(servicesDirectory);
    }

    public getService<S extends new () => Service>(serviceClass: S): InstanceType<S> {
        return this.services.get(serviceClass) as InstanceType<S>;
    }

    public getServiceByName<N extends keyof Services>(name: N): Services[N] {
        return this.servicesMappedByName.get(name) as Services[N];
    }
}

export { ServiceManager };
