import { Collection, Message, NonThreadGuildBasedChannel } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class ChannelCreateEvent extends BaseEvent {
    constructor() {
        super('channelCreate');
    }

    async run(client: DiscordClient, channel: NonThreadGuildBasedChannel) {
        await client.logger.onChannelCreate(channel);
    }
}