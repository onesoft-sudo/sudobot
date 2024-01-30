import { Class, DefaultExport } from "../types/Utils";
import { logInfo } from "../utils/logger";
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

        this.client[name as "startupManager"] = service as any;
        await this.client.dynamicLoader.loadEventsFromMetadata(service);
        await service.boot();

        logInfo(`${previousServiceInstance ? "Rel" : "L"}oaded Service: `, name);
    }

    loadServiceFromDirectory(servicesDirectory: string) {
        return this.client.dynamicLoader.loadServiceFromDirectory(servicesDirectory);
    }
}
