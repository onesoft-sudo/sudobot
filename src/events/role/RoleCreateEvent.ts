import { Collection, Message, NonThreadGuildBasedChannel, Role } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class RoleCreateEvent extends BaseEvent {
    constructor() {
        super('roleCreate');
    }

    async run(client: DiscordClient, role: Role) {
        await client.logger.onRoleCreate(role);
    }
}