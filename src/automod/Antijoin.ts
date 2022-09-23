import { GuildMember } from "discord.js";
import Service from "../utils/structures/Service";

export default class Antijoin extends Service {
    enabled = false;

    async start(member: GuildMember) {
        if (!this.enabled) {
            return false;
        }

        await member.kick("Anti-join systems are active right now");
        return true;
    }

    toggle() {
        this.enabled = !this.enabled;
    }
}