import { ExcludeEnum, PresenceStatusData } from "discord.js";
import { ActivityTypes } from "discord.js/typings/enums";
import Service from "../utils/structures/Service";
import { random } from "../utils/util";

export default class RandomStatus extends Service {
    async update(status?: PresenceStatusData) {
        status ??= random(['dnd', 'idle', 'online'] as PresenceStatusData[]);
        console.log(status);
        
        await this.client.user?.setActivity({
            type: this.client.config.props.status?.type ?? 'WATCHING',
            name: this.client.config.props.status?.name ?? 'over the server'
        });

        await this.client.user?.setStatus(status!);
    }

    async config(name?: string, type?: ExcludeEnum<typeof ActivityTypes, 'CUSTOM'>) {
        this.client.config.props.status ??= {};
        this.client.config.props.status.type = type ?? 'WATCHING';
        this.client.config.props.status.name = name ?? 'over the server';
        this.client.config.write();
    }
}