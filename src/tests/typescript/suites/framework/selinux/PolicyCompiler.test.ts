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

import { beforeEach, describe, expect, it } from "vitest";
import PolicyCompiler from "@framework/selinux/PolicyCompiler";
import { preformat } from "@framework/utils/string";
import { PermissionFlagsBits } from "discord.js";
import PoilcyModuleCompilationError from "@framework/selinux/PoilcyModuleCompilationError";

describe("PolicyCompiler", () => {
    let compiler: PolicyCompiler;

    beforeEach(() => {
        compiler = new PolicyCompiler();
    });

    it("can compile a basic empty module", () => {
        const result = compiler.compile(preformat`
            module {
                name "base";
                version 1000;
            }
        `);

        expect(result.policy_module).toStrictEqual({
            name: "base",
            version: 1000,
            author: undefined
        });
    });

    it("can compile a basic module with a few rules", () => {
        const result = compiler.compile(preformat`
            module {
                name "base";
                version 1000;
            }

            require {
                type user_t;
                type moderator_t;
            }

            allow moderator_t user_t { BanMembers };
        `);

        expect(result.policy_module).toStrictEqual({
            name: "base",
            version: 1000,
            author: undefined
        });
        expect(result.deny_types_on_targets).toStrictEqual({});
        expect(result.allow_types_on_targets).toStrictEqual({
            1: {
                0: PermissionFlagsBits.BanMembers
            }
        });
    });

    it("can report errors when appropriate", () => {
        expect(() => compiler.compile(preformat`
            module {
                name "base";
                version 1000;
            }

            require {
                type user_t;
                type moderator_t;
            }

            allow admin_t user_t { BanMembers };
        `)).toThrowError(PoilcyModuleCompilationError);
    });
});
