import Client from "../core/Client";

export function emoji(client: Client, name: string) {
    return client.emojis.cache.find(emoji => emoji.name === name || emoji.identifier === name);
}
