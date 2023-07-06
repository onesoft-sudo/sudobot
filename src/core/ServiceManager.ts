import Client from "./Client";

export default class ServiceManager {
    constructor(protected client: Client) { }

    async loadServices() {
        for (const service of this.client.services) {
            let replacedService = service;

            for (const alias in this.client.aliases) {
                replacedService = replacedService.replace(alias, this.client.aliases[alias as keyof typeof this.client.aliases]);
            }

            console.log("Loading service: ", service);

            const { default: Service, name } = await import(replacedService);
            const serviceInstance = new Service(this.client);
            this.client[name as "services"] = serviceInstance;
            await serviceInstance.boot();
        }
    }
}