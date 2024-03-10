import { mock } from "bun:test";
import { ClientUser } from "discord.js";
import Client from "../../src/core/Client";
import { randomSnowflake } from "./snowflakes";

mock.module("@prisma/client", () => {
    return {
        __esModule: true,
        PrismaClient: mock().mockImplementation(() => {
            return {
                user: {
                    findUnique: mock(),
                    create: mock(),
                    findMany: mock(),
                    update: mock(),
                    delete: mock()
                },
                troll: {
                    findUnique: mock(),
                    create: mock(),
                    findMany: mock(),
                    update: mock(),
                    delete: mock()
                }
            };
        })
    };
});

export function createClient() {
    const client = new Client({
        intents: []
    });

    client.user = {
        id: randomSnowflake(),
        username: "SudoBot",
        discriminator: "0000",
        tag: "SudoBot#0000",
        avatar: "avatar",
        bot: true,
        system: false
    } as ClientUser;

    return client;
}
