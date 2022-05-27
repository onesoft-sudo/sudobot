import { Emoji } from "discord.js";
import DiscordClient from "../client/Client";

function globalConfig() {
    return DiscordClient.client.config.props.global;
}

export async function fetchEmoji(name: string) {    
    return await findEmoji(e => e.name === name);
}

export async function findEmoji(callback: (e: Emoji) => boolean) {
    return await DiscordClient.client.emojis.cache.find(callback);
}