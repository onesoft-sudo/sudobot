import type Application from "@framework/app/Application";
import Service from "./Service";
import type { DefaultExport } from "@framework/types/Utils";
import { Collection } from "discord.js";
import { Logger } from "@framework/log/Logger";

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
}

export default ServiceManager;
