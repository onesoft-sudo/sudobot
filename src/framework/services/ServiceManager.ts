import { Collection } from "discord.js";
import Client from "../../core/Client";
import DiscordKernel from "../../core/DiscordKernel";
import { ESModule } from "../../types/ESModule";
import Container from "../container/Container";
import FileSystem from "../polyfills/FileSystem";
import { Service } from "./Service";

type ServiceConstructor = new (client: Client) => Service;

class ServiceManager {
    public constructor(protected readonly client: Client) {}
    private readonly services = new Collection<ServiceConstructor, Service>();

    public async loadServices() {
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
            value: instance,
            singleton: true
        });

        this.services.set(ServiceClass, instance);
        await instance.boot();
        this.client.logger.info(`Loaded service: ${name ?? ServiceClass.name}`);
    }

    public loadServicesFromDirectory(servicesDirectory: string) {
        return this.client.dynamicLoader.loadServicesFromDirectory(servicesDirectory);
    }

    getService<S extends new () => Service>(serviceClass: S): InstanceType<S> {
        return this.services.get(serviceClass) as InstanceType<S>;
    }
}

export { ServiceManager };
