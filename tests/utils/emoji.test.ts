import { emoji } from "@/utils/emoji";
import Application from "@framework/app/Application";
import type BaseClient from "@framework/client/BaseClient";
import { ApplicationEmoji, Collection } from "discord.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createApplication } from "../mocks/application.mock";
import { createClient } from "../mocks/client.mock";
import { createGuild } from "../mocks/guild.mock";

describe("emoji", () => {
    let application: Application;

    beforeEach(() => {
        const client = {
            ...createClient(),
            application: {
                emojis: {
                    cache: new Collection()
                }
            }
        } as unknown as BaseClient;

        application = createApplication();
        application.setClient(client);
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
            },
            application: application.client.application
        } as unknown as ApplicationEmoji;
        application.client.application?.emojis.cache.set("emoji", testEmoji);
        expect(emoji(application, "emoji")).toBe(testEmoji);
    });
});
