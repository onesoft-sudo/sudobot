/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

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
                public override description = "test";
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
