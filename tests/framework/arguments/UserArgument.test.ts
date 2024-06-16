import { Casted } from "@framework/arguments/Argument";
import UserArgument from "@framework/arguments/UserArgument";
import BaseClient from "@framework/client/BaseClient";
import * as entityUtils from "@framework/utils/entities";
import { Snowflake, User } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "../../mocks/application.mock";
import { randomSnowflake } from "../../mocks/snowflakes";
import { initialize } from "./ArgumentTestUtils";

const fetchUser = vi
    .spyOn(entityUtils, "fetchUser")
    .mockImplementation(async (client: BaseClient<boolean>, userId: Snowflake) => {
        if (userId === "11111111111111111") {
            return null;
        }

        return {
            [Symbol.hasInstance]: (obj: unknown) => obj === User,
            id: userId,
            client
        } as unknown as User;
    });

describe("UserArgument", () => {
    const { client } = createApplication();

    let userId: Snowflake, guildId: Snowflake;
    let data: ReturnType<typeof initialize>;

    beforeEach(() => {
        userId = randomSnowflake();
        guildId = randomSnowflake();
    });

    afterEach(() => {
        fetchUser.mockClear();
    });

    it("should parse a user argument with mentions", async () => {
        data = initialize({
            content: `test <@${userId}>`,
            userId,
            guildId,
            prefix: "!"
        });

        const result = (await UserArgument.performCast(
            data.context,
            data.content,
            data.argv,
            data.argv[1],
            0,
            "testarg",
            undefined,
            true
        )) as Casted<User>;

        expect(result.value?.getRawValue()).toBe(`<@${userId}>`);
        expect(result.value?.getValue().id).toBe(userId);
        expect(result.error).toBeUndefined();
        expect(fetchUser).toBeCalledWith(client, userId);
        expect(fetchUser).toBeCalledTimes(1);
    });

    it("should parse a user argument with snowflake IDs", async () => {
        data = initialize({
            content: `test ${userId}`,
            userId,
            guildId,
            prefix: "!"
        });

        const result = (await UserArgument.performCast(
            data.context,
            data.content,
            data.argv,
            data.argv[1],
            0,
            "testarg",
            undefined,
            true
        )) as Casted<User>;

        expect(result.value?.getRawValue()).toBe(`${userId}`);
        expect(result.value?.getValue().id).toBe(userId);
        expect(result.error).toBeUndefined();
        expect(fetchUser).toBeCalledWith(client, userId);
        expect(fetchUser).toBeCalledTimes(1);
    });
});
