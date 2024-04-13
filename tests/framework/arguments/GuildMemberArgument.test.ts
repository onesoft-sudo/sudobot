import { Casted } from "@framework/arguments/Argument";
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument";
import * as entityUtils from "@framework/utils/entities";
import { Guild, GuildMember, Snowflake, User } from "discord.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "../../mocks/application.mock";
import { randomSnowflake } from "../../mocks/snowflakes";
import { initialize } from "./ArgumentTestUtils";

const fetchMember = vi
    .spyOn(entityUtils, "fetchMember")
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
        fetchMember.mockClear();
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
        expect(fetchMember).toBeCalledWith(data.message.guild, userId);
        expect(fetchMember).toBeCalledTimes(1);
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
        expect(fetchMember).toBeCalledWith(data.message.guild, userId);
        expect(fetchMember).toBeCalledTimes(1);
    });
});
