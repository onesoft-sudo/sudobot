import { Invite } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class InviteCreateEvent extends BaseEvent {
    constructor() {
        super('inviteCreate');
    }

    async run(client: DiscordClient, invite: Invite) {
        await client.inviteTracker.onInviteCreate(invite);
    }
}