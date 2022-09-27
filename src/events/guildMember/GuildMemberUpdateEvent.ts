import { GuildMember } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class GuildMemberUpdateEvent extends BaseEvent {
    constructor() {
        super('guildMemberUpdate');
    }

    async run(client: DiscordClient, oldMember: GuildMember, newMember: GuildMember) {
        if (newMember.user.bot) {
            return;
        }

        if (newMember.nickname === oldMember.nickname && newMember.user.tag === oldMember.user.tag) {
            return;
        }

        console.log("Here");

        client.profileFilter.check(newMember);
    }
}