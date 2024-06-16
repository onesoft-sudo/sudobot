import type BaseClient from "@framework/client/BaseClient";
import { emoji } from "@framework/utils/emoji";
import { Collection, GuildEmoji } from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createClient } from "../mocks/client.mock";
import { createGuild } from "../mocks/guild.mock";

describe("emoji", () => {
    let client: BaseClient;

    beforeEach(() => {
        client = {
            ...createClient(),
            emojis: {
                cache: new Collection()
            }
        } as unknown as BaseClient;
    });

    it("should return the emoji", () => {
        const testEmoji = {
            id: "emoji",
            name: "emoji",
            animated: false,
            available: true,
            createdAt: new Date(),
            createdTimestamp: 0,
            guild: createGuild(),
            identifier: "emoji",
            url: "emoji",
            toString() {
                return "emoji";
            }
        } as GuildEmoji;
        client.emojis.cache.set("emoji", testEmoji);
        expect(emoji(client, "emoji")).toBe(testEmoji);
    });
});
