import { Collection, Message, NonThreadGuildBasedChannel, Role } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class RoleUpdateEvent extends BaseEvent {
    constructor() {
        super('roleUpdate');
    }

    async run(client: DiscordClient, oldRole: Role, newRole: Role) {
        await client.logger.onRoleUpdate(oldRole, newRole);
    }
}