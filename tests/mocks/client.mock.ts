import "reflect-metadata";

import Client from "@/core/Client";
import { ClientUser } from "discord.js";
import { randomSnowflake } from "./snowflakes";

export function createClient() {
    const client = new Client({
        intents: []
    });

    const id = randomSnowflake();

    client.user = {
        id,
        username: "SudoBot",
        discriminator: "0000",
        tag: "SudoBot#0000",
        avatar: "avatar",
        bot: true,
        system: false,
        client,
        toString() {
            return `<@${id}>`;
        }
    } as unknown as ClientUser;

    return client as Client<true>;
}
