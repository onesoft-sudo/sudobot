import { Collection, Message, NonThreadGuildBasedChannel } from "discord.js";
import DiscordClient from "../../client/Client";
import BaseEvent from "../../utils/structures/BaseEvent";

export default class ChannelDeleteEvent extends BaseEvent {
    constructor() {
        super('channelDelete');
    }

    async run(client: DiscordClient, channel: NonThreadGuildBasedChannel) {
        await client.logger.onChannelDelete(channel);
    }
}