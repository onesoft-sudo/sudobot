import { Guild } from "discord.js";
import EventListener from "../../core/EventListener";
import { Events } from "../../types/ClientEvents";

export default class GuildCreateEvent extends EventListener<Events.GuildCreate> {
    public readonly name = Events.GuildCreate;

    async execute(guild: Guild) {
        if (!process.env.PRIVATE_BOT_MODE) {
            this.client.configManager.autoConfigure(guild.id);
        }
    }
}
