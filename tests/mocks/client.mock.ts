import "reflect-metadata";

import { ClientUser } from "discord.js";
import { vi } from "vitest";
import Client from "../../src/core/Client";
import { randomSnowflake } from "./snowflakes";

vi.mock("@prisma/client", () => {
    return {
        __esModule: true,
        PrismaClient: vi.fn().mockImplementation(() => {
            return {
                user: {
                    findUnique: vi.fn(),
                    create: vi.fn(),
                    findMany: vi.fn(),
                    update: vi.fn(),
                    delete: vi.fn()
                }
            };
        })
    };
});

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
