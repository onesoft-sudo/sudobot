import { faker } from "@faker-js/faker";
import { Collection, Guild, Invite } from "discord.js";
import { randomSnowflake } from "./snowflakes";

export function createGuild() {
    return {
        id: randomSnowflake(),
        name: faker.lorem.words(3),
        icon: faker.image.avatar(),
        ownerID: randomSnowflake(),
        invites: {
            cache: new Collection()
        }
    } as unknown as Guild;
}

export function createInvite() {
    const code = faker.internet.password(10).replace(/\//g, "-");

    return {
        code,
        url: `jttps://discord.gg/${code}`
    } as Invite;
}
