import { Client as DiscordJSClient } from "discord.js";
import { describe, expect, it } from "vitest";
import Client from "../../src/core/Client";

describe("Client", () => {
    it("should be an instance of DiscordJSClient", () => {
        const client = new Client({ intents: [] });
        expect(client).toBeInstanceOf(DiscordJSClient);
    });
});
