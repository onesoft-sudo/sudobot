import { ExcludeEnum, PresenceStatusData } from "discord.js";
import { ActivityTypes } from "discord.js/typings/enums";
import DiscordClient from "../client/Client";
import Service from "../utils/structures/Service";
import { random } from "../utils/util";

export default class RandomStatus extends Service {
    async update(name?: string, type?: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>, status?: PresenceStatusData) {
        status ??= random(['dnd', 'idle', 'online'] as PresenceStatusData[]);
        console.log(status);
        
        await this.client.user?.setActivity({
            type: type ?? this.client.config.props.global.status.name ?? 'WATCHING',
            name: name ?? this.client.config.props.global.status.type ?? 'over the server'
        });

        this.client.config.props.global.status = type || name ? {} : null;

        if (name) {
            this.client.config.props.global.status.name = name;
        }

        if (type) {
            this.client.config.props.global.status.type = type;
        }

        await this.client.user?.setStatus(status!);
        await this.client.config.write();
    }
}