import { type APIMessage, Client, Message } from "discord.js";

export const createClient = () => new Client({ intents: [] });

export const randomSnowflake = () =>
    `${Math.round(Math.random() * 50000000000)}${Math.round(Math.random() * 50000000)}`;

export const createMessage = (client: Client) =>
    new (Message as new (client: Client, data: APIMessage) => Message)(client, {
        id: randomSnowflake(),
        author: {
            id: randomSnowflake(),
            username: "random"
        },
        channel_id: randomSnowflake()
    } as APIMessage);
