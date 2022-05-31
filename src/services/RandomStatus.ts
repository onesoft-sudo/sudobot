import { ExcludeEnum, PresenceStatusData } from "discord.js";
import { ActivityTypes } from "discord.js/typings/enums";
import DiscordClient from "../client/Client";
import { random } from "../utils/util";

export default class RandomStatus {
    constructor(protected client: DiscordClient) {
        
    }

    async update(name?: string, type?: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>, status?: PresenceStatusData) {
        status ??= random(['dnd', 'idle', 'online'] as PresenceStatusData[]);
        console.log(status);
        
        await this.client.user?.setActivity({
            type: type ?? 'WATCHING',
            name: name ?? 'over the server'
        });

        await this.client.user?.setStatus(status!);
    }
}