import { Emoji } from "discord.js";
import DiscordClient from "../client/Client";

function globalConfig() {
    return DiscordClient.client.config.props.global;
}

export async function fetchEmoji(name: string) {    
    return await findEmoji(e => e.name === name);
}

export async function fetchEmojiStr(name: string) {    
    return (await findEmoji(e => e.name === name))?.toString();
}

export function emoji(name: string) {
    return findEmoji(e => e.name === name)?.toString();
}

export function findEmoji(callback: (e: Emoji) => boolean) {
    return DiscordClient.client.guilds.cache.find(g => g.id === globalConfig().id)!.emojis.cache.find(callback);
}