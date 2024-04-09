import { faker } from "@faker-js/faker";
import { Guild, GuildMember, Message, Snowflake, User } from "discord.js";
import { afterEach, mock } from "node:test";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Casted } from "../../../src/framework/arguments/Argument";
import GuildMemberArgument from "../../../src/framework/arguments/GuildMemberArgument";
import { InvalidArgumentError } from "../../../src/framework/arguments/InvalidArgumentError";
import StringArgument from "../../../src/framework/arguments/StringArgument";
import UserArgument from "../../../src/framework/arguments/UserArgument";
import BaseClient from "../../../src/framework/client/BaseClient";
import LegacyContext from "../../../src/framework/commands/LegacyContext";
import * as fetchUtils from "../../../src/utils/fetch";
import { createApplication } from "../../mocks/application.mock";
import { randomSnowflake } from "../../mocks/snowflakes";
import { initialize } from "./ArgumentTestUtils";

const safeUserFetch = vi
    .spyOn(fetchUtils, "safeUserFetch")
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

afterEach(() => {
    mock.reset();
});

describe("Argument", async () => {
    const prefix = "-";
    const { client } = createApplication();

    let context: LegacyContext;
    let commandContent: string;
    let argv: string[], args: string[];

    describe("<commons>", () => {
        beforeEach(() => {
            commandContent = faker.lorem.words(5);

            const message = {
                content: `${prefix}${commandContent}`
            } as Message<true>;
            argv = commandContent.split(" ");
            args = argv.slice(1);

            context = new LegacyContext(
                argv[0],
                message.content.slice(prefix.length),
                message,
                args,
                argv
            );
        });

        it("should parse an argument and return correct information", async () => {
            const result = await StringArgument.performCast(
                context,
                commandContent,
                argv,
                argv[1],
                1,
                "testarg",
                undefined,
                true
            );

            expect(result.value?.getRawValue()).toBe(argv[1]);
            expect(result.value?.getValue()).toBe(argv[1]);
            expect(result.value?.position).toBe(1);
            expect(result.value?.name).toBe("testarg");
            expect(result.error).toBeUndefined();
        });
    });

    describe("UserArgument and GuildMemberArgument", () => {
        let userId: Snowflake, guildId: Snowflake;

        beforeEach(() => {
            userId = randomSnowflake();
            guildId = randomSnowflake();
        });

        const customInitialize = (content: string) => {
            commandContent = content;

            const result = initialize({
                content,
                userId,
                guildId,
                prefix
            });

            context = result.context;
            argv = result.argv;
            args = result.args;
        };

        describe("with mentions", () => {
            beforeEach(() => {
                customInitialize(`test <@${userId}>`);
            });

            afterAll(() => {
                safeMemberFetch.mockClear();
                safeUserFetch.mockClear();
            });

            it("should parse a user argument", async () => {
                const result = (await UserArgument.performCast(
                    context,
                    commandContent,
                    argv,
                    argv[1],
                    0,
                    "testarg",
                    undefined,
                    true
                )) as Casted<User>;

                expect(result.value?.getRawValue()).toBe(`<@${userId}>`);
                expect(result.value?.getValue().id).toBe(userId);
                expect(result.error).toBeUndefined();
                expect(safeUserFetch).toBeCalledWith(client, userId);
                expect(safeUserFetch).toBeCalledTimes(1);
            });

            it("should parse a guild member argument", async () => {
                const result = (await GuildMemberArgument.performCast(
                    context,
                    commandContent,
                    argv,
                    argv[1],
                    0,
                    "testarg",
                    undefined,
                    true
                )) as Casted<User>;

                expect(result.value?.getRawValue()).toBe(`<@${userId}>`);
                expect(result.value?.getValue().id).toBe(userId);
                expect(result.error).toBeUndefined();
                expect(safeMemberFetch).toBeCalledWith(context.guild, userId);
                expect(safeMemberFetch).toBeCalledTimes(1);
            });
        });

        describe("with snowflakes", () => {
            beforeEach(() => {
                customInitialize(`test ${userId}`);
            });

            afterAll(() => {
                safeMemberFetch.mockClear();
                safeUserFetch.mockClear();
            });

            it("should parse a user argument", async () => {
                const result = (await UserArgument.performCast(
                    context,
                    commandContent,
                    argv,
                    argv[1],
                    0,
                    "testarg",
                    undefined,
                    true
                )) as Casted<User>;

                expect(result.value?.getRawValue()).toBe(`${userId}`);
                expect(result.value?.getValue().id).toBe(userId);
                expect(result.error).toBeUndefined();
                expect(safeUserFetch).toBeCalledWith(client, userId);
                expect(safeUserFetch).toBeCalledTimes(1);
            });

            it("should parse a guild member argument", async () => {
                const result = (await GuildMemberArgument.performCast(
                    context,
                    commandContent,
                    argv,
                    argv[1],
                    0,
                    "testarg",
                    undefined,
                    true
                )) as Casted<User>;

                expect(result.value?.getRawValue()).toBe(`${userId}`);
                expect(result.value?.getValue().id).toBe(userId);
                expect(result.error).toBeUndefined();
                expect(safeMemberFetch).toBeCalledWith(context.guild, userId);
                expect(safeMemberFetch).toBeCalledTimes(1);
            });
        });

        describe("with invalid user", () => {
            beforeEach(() => {
                customInitialize("test 11111111111111111");
            });

            afterAll(() => {
                safeMemberFetch.mockClear();
                safeUserFetch.mockClear();
            });

            it("should parse a user argument", async () => {
                const result = (await UserArgument.performCast(
                    context,
                    commandContent,
                    argv,
                    argv[1],
                    0,
                    "testarg",
                    undefined,
                    true
                )) as Casted<User>;

                expect(result.value).toBeUndefined();
                expect(result.error).toBeInstanceOf(InvalidArgumentError);
                expect(safeUserFetch).toBeCalledWith(client, "11111111111111111");
                expect(safeUserFetch).toBeCalledTimes(1);
            });

            it("should parse a guild member argument", async () => {
                const result = (await GuildMemberArgument.performCast(
                    context,
                    commandContent,
                    argv,
                    argv[1],
                    0,
                    "testarg",
                    undefined,
                    true
                )) as Casted<User>;

                expect(result.value).toBeUndefined();
                expect(result.error).toBeInstanceOf(InvalidArgumentError);
                expect(safeMemberFetch).toBeCalledWith(context.guild, "11111111111111111");
                expect(safeMemberFetch).toBeCalledTimes(1);
            });
        });
    });
});
