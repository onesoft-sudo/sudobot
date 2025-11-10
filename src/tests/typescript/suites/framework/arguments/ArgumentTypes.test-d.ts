import type { ArgumentSchema } from "@framework/arguments/ArgumentSchema";
import type { ArgumentsOf } from "@framework/arguments/ArgumentTypes";
import StringArgument from "@framework/arguments/StringArgument";
import UserArgument from "@framework/arguments/UserArgument";
import DurationArgument from "@framework/arguments/DurationArgument";
import GuildMemberArgument from "@framework/arguments/GuildMemberArgument";
import { describe, it, vi, expectTypeOf } from "vitest";
import Command from "@framework/commands/Command";
import type { GuildMember, User } from "discord.js";
import type Duration from "@framework/datetime/Duration";

describe("ArgumentTypes", () => {
    describe("ArgumentsOf<T>", () => {
        it("correctly infers argument types", () => {
            class TestCommand extends Command {
                public override name = "test";
                public override execute = vi.fn();
                public override argumentSchema = {
                    overloads: [
                        {
                            definitions: [
                                {
                                    name: "user",
                                    type: UserArgument
                                },
                                {
                                    name: "reason",
                                    type: StringArgument
                                }
                            ]
                        },
                        {
                            definitions: [
                                {
                                    name: "member",
                                    type: GuildMemberArgument
                                },
                                {
                                    name: "duration",
                                    type: DurationArgument
                                },
                                {
                                    name: "reason",
                                    type: StringArgument
                                }
                            ]
                        }
                    ]
                } as const satisfies ArgumentSchema;
            }

            const argumentValues = {} as ArgumentsOf<TestCommand>;
            type ExpectedType =
                | {
                      user: User | null;
                      reason: string;
                  }
                | {
                      member: GuildMember | null;
                      duration: Duration;
                      reason: string;
                  };

            expectTypeOf(argumentValues).toEqualTypeOf<ExpectedType>();
        });
    });
});
