import { Collection, Message, NonThreadGuildBasedChannel, Role } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class RoleDeleteEvent extends BaseEvent {
    constructor() {
        super('roleDelete');
    }

    async run(client: DiscordClient, role: Role) {
        await client.logger.onRoleDelete(role);
    }
}