import Client from "./Client";

export default abstract class Service {
    constructor(protected client: Client) { }
    async boot() { }
}