import type { Client, Snowflake } from "discord.js";
import { MessageType, type GuildBasedChannel, type Message, type User } from "discord.js";

export function userInfo(user: User) {
    return `ID: ${user.id}\nUsername: ${user.username}\nMention: <@${user.id}>`;
}

export function channelInfo(channel: GuildBasedChannel) {
    return `ID: ${channel.id}\nName: ${channel.name}\nMention: <#${channel.id}>`;
}

export function messageInfo(message: Message) {
    return `ID: ${message.id}\nType: ${MessageType[message.type]}\nURL: ${message.url}`;
}

export function shortUserInfo(client: Client, userId: Snowflake) {
    if (userId === client.user!.id) {
        return "System";
    }

    return `<@${userId}> [\`${userId}\`]`;
}
