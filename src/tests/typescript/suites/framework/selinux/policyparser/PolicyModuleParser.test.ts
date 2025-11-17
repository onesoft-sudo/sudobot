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
import PolicyModuleParser from "@framework/selinux/policyparser/PolicyModuleParser";
import { PolicyModuleTokenType } from "@framework/selinux/policyparser/PolicyModuleTokenType";
import type { Range } from "@framework/selinux/policyparser/PolicyModuleParserTypes";
import RootNode from "@framework/selinux/policyparser/RootNode";
import AllowDenyStatementNode from "@framework/selinux/policyparser/AllowDenyStatementNode";
import type Node from "@framework/selinux/policyparser/Node";

const RANGE_TRUNCATED: Range = { start: [0, 1, 1], end: [0, 1, 1] };

function truncateLocation(node: Node) {
    Object.defineProperty(node, "range", { value: RANGE_TRUNCATED });

    for (const branch of node.branches()) {
        truncateLocation(branch);
    }

    return node;
}

describe("PolicyModuleParser", () => {
    let parser: PolicyModuleParser;

    beforeEach(() => {
        parser = new PolicyModuleParser();
    });

    describe("Lexer", () => {
        it("can tokenize basic inputs correctly", () => {
            const tokens = parser.lex(
                `
                allow user_t moderator_t { BanMembers };
                allow admin_t moderator_t { ManageRoles };
            `
                    .trim()
                    .replace(/\n[\t ]+/g, "\n")
            );

            expect(tokens.length).toBe(15);

            const expectedTypes = [
                { type: PolicyModuleTokenType.Allow, value: "allow" },
                { type: PolicyModuleTokenType.Identifier, value: "user_t" },
                { type: PolicyModuleTokenType.Identifier, value: "moderator_t" },
                { type: PolicyModuleTokenType.BraceOpen, value: "{" },
                { type: PolicyModuleTokenType.Identifier, value: "BanMembers" },
                { type: PolicyModuleTokenType.BraceClose, value: "}" },
                { type: PolicyModuleTokenType.Semicolon, value: ";" },
                { type: PolicyModuleTokenType.Allow, value: "allow" },
                { type: PolicyModuleTokenType.Identifier, value: "admin_t" },
                { type: PolicyModuleTokenType.Identifier, value: "moderator_t" },
                { type: PolicyModuleTokenType.BraceOpen, value: "{" },
                { type: PolicyModuleTokenType.Identifier, value: "ManageRoles" },
                { type: PolicyModuleTokenType.BraceClose, value: "}" },
                { type: PolicyModuleTokenType.Semicolon, value: ";" },
                { type: PolicyModuleTokenType.EndOfFile, value: "EOF" }
            ];

            for (const { type, value } of expectedTypes) {
                const token = tokens.shift();
                expect(token?.type).toBe(type);
                expect(token?.value).toBe(value);
            }
        });

        it("correctly adds token location information", () => {
            const tokens = parser.lex(
                `
                allow user_t { "BanMembers" 10 }
                `
                    .trim()
                    .replace(/\n(\s+)/g, "\n")
            );

            expect(tokens.length).toBe(7);

            const expectedLocations: Range[] = [
                {
                    start: [0, 1, 1],
                    end: [5, 1, 6]
                },
                {
                    start: [6, 1, 7],
                    end: [12, 1, 13]
                },
                {
                    start: [13, 1, 14],
                    end: [14, 1, 15]
                },
                {
                    start: [15, 1, 16],
                    end: [27, 1, 28]
                },
                {
                    start: [28, 1, 29],
                    end: [30, 1, 31]
                }
            ];

            for (const { start, end } of expectedLocations) {
                const token = tokens.shift();
                expect(token?.loc.start).toEqual(start);
                expect(token?.loc.end).toEqual(end);
            }
        });
    });

    describe("Parser", () => {
        it("can parse a simple input", () => {
            expect(truncateLocation(parser.parse("allow moderator_t user_t { BanMembers }"))).toStrictEqual(
                new RootNode(
                    [new AllowDenyStatementNode("allow", "moderator_t", "user_t", ["BanMembers"], RANGE_TRUNCATED)],
                    RANGE_TRUNCATED
                )
            );
        });

        it("can parse multiple statements", () => {
            expect(truncateLocation(parser.parse(`
                allow moderator_t user_t { BanMembers };
                deny moderator_t user_t { AttachFiles };
                allow chat_mod_t user_t { KickMembers, AttachFiles };
                allow admin_t moderator_t { BanMembers, ManageRoles };
            `))).toStrictEqual(
                new RootNode(
                    [
                        new AllowDenyStatementNode("allow", "moderator_t", "user_t", ["BanMembers"], RANGE_TRUNCATED),
                        new AllowDenyStatementNode("deny", "moderator_t", "user_t", ["AttachFiles"], RANGE_TRUNCATED),
                        new AllowDenyStatementNode("allow", "chat_mod_t", "user_t", ["KickMembers", "AttachFiles"], RANGE_TRUNCATED),
                        new AllowDenyStatementNode("allow", "admin_t", "moderator_t", ["BanMembers", "ManageRoles"], RANGE_TRUNCATED),
                    ],
                    RANGE_TRUNCATED,
                )
            );
        });
    });
});
