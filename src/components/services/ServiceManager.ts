import { Client, Collection } from "discord.js";
import DiscordKernel from "../../core/DiscordKernel";
import { ESModule } from "../../types/ESModule";
import BindToContainer from "../container/BindToContainer";
import FileSystem from "../polyfills/FileSystem";
import { HasClient } from "../utils/HasClient";
import { Service } from "./Service";

type ServiceConstructor = new (client: Client) => Service;

@BindToContainer({ singleton: true })
class ServiceManager extends HasClient {
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
        await instance.boot();
        this.services.set(ServiceClass, instance);
        this.client.logger.info(`Loaded service: ${name ?? ServiceClass.name}`);
    }

    public async loadServiceFromDirectory(servicesDirectory: string) {
        throw new Error("Method not implemented.");
    }

    getService<S extends new () => Service>(serviceClass: S): InstanceType<S> {
        return this.services.get(serviceClass) as InstanceType<S>;
    }
}

export { ServiceManager };
