import DiscordClient from "../../client/Client";

export default abstract class Service {
    constructor(protected client: DiscordClient) {}
}