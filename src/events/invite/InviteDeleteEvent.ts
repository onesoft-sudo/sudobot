import { Invite } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class InviteDeleteEvent extends BaseEvent {
    constructor() {
        super('inviteDelete');
    }

    async run(client: DiscordClient, invite: Invite) {
        await client.inviteTracker.onInviteDelete(invite);
    }
}