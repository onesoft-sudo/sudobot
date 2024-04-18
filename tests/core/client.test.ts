import Client from "@/core/Client";
import { Client as DiscordJSClient } from "discord.js";
import { describe, expect, it } from "vitest";

describe("Client", () => {
    it("should be an instance of DiscordJSClient", () => {
        const client = new Client({ intents: [] });
        expect(client).toBeInstanceOf(DiscordJSClient);
    });
});
