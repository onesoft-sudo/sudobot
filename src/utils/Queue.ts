import { Guild, TextChannel } from "discord.js";
import Client from "../core/Client";
import { logError } from "./logger";
import { isTextableChannel } from "./utils";

export interface QueueConstructorOptions {
    client: Client;
    createdAt: Date;
    willRunAt: Date;
    guild: Guild;
    channelId?: string;
    messageId?: string;
    userId: string;
    filePath: string;
    args: string[];
    id?: number;
    name: string;
}

export default abstract class Queue {
    protected readonly client: Client;
    public readonly createdAt: Date;
    public readonly willRunAt: Date;
    public readonly guild: Guild;
    public readonly channelId: string | undefined;
    public readonly messageId: string | undefined;
    public readonly userId: string;
    public readonly filePath: string;
    public readonly args: string[] = [];

    constructor({ client, createdAt, willRunAt, guild, channelId, messageId, userId, filePath, args }: QueueConstructorOptions) {
        this.client = client;
        this.createdAt = createdAt;
        this.willRunAt = willRunAt;
        this.guild = guild;
        this.channelId = channelId;
        this.messageId = messageId;
        this.userId = userId;
        this.filePath = filePath;
        this.args = args;
    }

    async channel() {
        if (!this.channelId)
            return;

        try {
            return await (this.guild.channels.cache.get(this.channelId) ?? this.guild.channels.fetch(this.channelId));
        }
        catch (e) {
            logError(e);
            return null;
        }
    }

    async message(channel?: TextChannel) {
        if (!this.messageId)
            return null;

        try {
            const fetchedChannel = channel ?? await this.channel();

            if (!fetchedChannel || !isTextableChannel(fetchedChannel))
                return null;

            return fetchedChannel.messages.cache.get(this.messageId) ?? await fetchedChannel.messages.fetch(this.messageId);
        }
        catch (e) {
            logError(e);
            return null;
        }
    }

    abstract run(...args: string[]): Promise<any> | any;
}