import "../setup";

import { ChatInputCommandInteraction, Message } from "discord.js";
import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import Client from "../../src/core/Client";
import { protectSystemAdminsFromCommands } from "../../src/utils/troll";
import { registerFileHandler, setCustomSystemConfig, unregisterFileHandler } from "../clientsetup";
import { randomSnowflake } from "../utils";

const client = new Client(
    {
        intents: []
    },
    {
        services: ["@services/ConfigManager"]
    }
);

describe("Trolling utility functions", () => {
    const CLIENT_USER_ID = randomSnowflake();
    const SYSTEM_ADMIN = randomSnowflake();

    before(() => {
        setCustomSystemConfig(`
            {
                "system_admins": ["${SYSTEM_ADMIN}"]
            }
        `);
        registerFileHandler();
        return client.boot();
    });

    after(() => {
        unregisterFileHandler();
    });

    it("Protects system admins from being used in joke moderation commands", async t => {
        const message1 = {
            deferred: false,
            async reply() {},
            async editReply() {}
        } as unknown as Message & Pick<ChatInputCommandInteraction, "editReply">;

        const message2 = {
            deferred: true,
            async reply() {},
            async editReply() {}
        } as unknown as Message & Pick<ChatInputCommandInteraction, "editReply">;

        t.mock.method(message1, "reply");
        t.mock.method(message1, "editReply");
        t.mock.method(message2, "reply");
        t.mock.method(message2, "editReply");

        client.user = { id: CLIENT_USER_ID } as any;

        assert.strictEqual(await protectSystemAdminsFromCommands(client, message1, randomSnowflake()), false);
        assert.strictEqual((message1.reply as any).mock.calls.length, 0);
        assert.strictEqual((message1.editReply as any).mock.calls.length, 0);

        assert.strictEqual(await protectSystemAdminsFromCommands(client, message2, randomSnowflake()), false);
        assert.strictEqual((message2.reply as any).mock.calls.length, 0);
        assert.strictEqual((message2.editReply as any).mock.calls.length, 0);

        assert.strictEqual(await protectSystemAdminsFromCommands(client, message1, SYSTEM_ADMIN), true);
        assert.strictEqual((message1.reply as any).mock.calls.length, 1);
        assert.strictEqual((message1.editReply as any).mock.calls.length, 0);

        assert.strictEqual(await protectSystemAdminsFromCommands(client, message2, SYSTEM_ADMIN), true);
        assert.strictEqual((message2.reply as any).mock.calls.length, 0);
        assert.strictEqual((message2.editReply as any).mock.calls.length, 1);

        assert.strictEqual(await protectSystemAdminsFromCommands(client, message1, CLIENT_USER_ID), true);
        assert.strictEqual((message1.reply as any).mock.calls.length, 2);
        assert.strictEqual((message1.editReply as any).mock.calls.length, 0);

        assert.strictEqual(await protectSystemAdminsFromCommands(client, message2, CLIENT_USER_ID), true);
        assert.strictEqual((message2.reply as any).mock.calls.length, 0);
        assert.strictEqual((message2.editReply as any).mock.calls.length, 2);
    });
});
