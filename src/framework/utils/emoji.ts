import BaseClient from "../client/BaseClient";

export function emoji(client: BaseClient, name: string) {
    return client.emojis.cache.find(emoji => emoji.name === name || emoji.identifier === name);
}
