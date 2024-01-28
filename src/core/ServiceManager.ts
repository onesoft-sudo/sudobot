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

    // FIXME: Decorator based event listeners and lifecycle methods
    async loadService(filepath: string) {
        const { default: ServiceClass, name }: DefaultExport<Class<Service, [Client]>> & { name?: keyof Client } = await import(
            filepath
        );

        if (!name) {
            throw new Error(`Name is empty for service ${filepath}`);
        }

        const service = new ServiceClass(this.client);
        this.client[name as "startupManager"] = service as any;
        await service.boot();

        logInfo("Loaded Service: ", name);
    }
}
