import { Guild, GuildMember, Snowflake, User } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Casted } from "../../../src/framework/arguments/Argument";
import GuildMemberArgument from "../../../src/framework/arguments/GuildMemberArgument";
import * as fetchUtils from "../../../src/utils/fetch";
import { createApplication } from "../../mocks/application.mock";
import { randomSnowflake } from "../../mocks/snowflakes";
import { initialize } from "./ArgumentTestUtils";

const safeMemberFetch = vi
    .spyOn(fetchUtils, "safeMemberFetch")
    .mockImplementation(async (guild: Guild, memberId: Snowflake) => {
        if (memberId === "11111111111111111") {
            return null;
        }

        return {
            [Symbol.hasInstance]: (obj: unknown) => obj === GuildMember,
            id: memberId,
            guild,
            user: {
                id: memberId
            }
        } as unknown as GuildMember;
    });

describe("GuildMemberArgument", () => {
    createApplication();

    let userId: Snowflake, guildId: Snowflake;
    let data: ReturnType<typeof initialize>;

    beforeEach(() => {
        userId = randomSnowflake();
        guildId = randomSnowflake();
    });

    afterEach(() => {
        safeMemberFetch.mockClear();
    });

    it("should parse a guild member argument with mentions", async () => {
        data = initialize({
            content: `test <@${userId}>`,
            userId,
            guildId,
            prefix: "!"
        });

        const result = (await GuildMemberArgument.performCast(
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
        expect(safeMemberFetch).toBeCalledWith(data.message.guild, userId);
        expect(safeMemberFetch).toBeCalledTimes(1);
    });

    it("should parse a guild member argument with snowflake IDs", async () => {
        data = initialize({
            content: `test ${userId}`,
            userId,
            guildId,
            prefix: "!"
        });

        const result = (await GuildMemberArgument.performCast(
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
        expect(safeMemberFetch).toBeCalledWith(data.message.guild, userId);
        expect(safeMemberFetch).toBeCalledTimes(1);
    });
});
