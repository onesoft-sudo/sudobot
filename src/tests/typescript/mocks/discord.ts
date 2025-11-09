import { type APIGuildMember, type APIMessage, type APIUser, Client, GuildMember, Message } from "discord.js";

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

export const createMember = (client: Client, id: string = randomSnowflake()) =>
    new (GuildMember as new (client: Client, data: APIGuildMember) => GuildMember)(client, {
        user: {
            id
        } as APIUser
    } as APIGuildMember);
