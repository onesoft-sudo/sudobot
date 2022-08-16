import Service from "../utils/structures/Service";
import DiscordClient from "./Client";

export default class ServiceManager {
    constructor(protected client: DiscordClient, protected aliases: { [alias: string]: string }= {}) {

    }

    load(services: { [alias: string]: string }) {
        for (const service of Object.keys(services)) {
            let path = service;

            for (const alias in this.aliases) {
                path = path.replace('@' + alias, this.aliases[alias]);
            }

            console.log('Loading service: ', service);

            const { default: ServiceClass }: { default: typeof Service } = require(path);

            // @ts-ignore
            this.client[services[service]] = new ServiceClass(this.client);
        }
    }
}