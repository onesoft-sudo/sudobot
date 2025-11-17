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

import AllowDenyStatementNode from "./AllowDenyStatementNode";
import type Node from "./Node";
import PolicyModuleParserError from "./PolicyModuleParserError";
import type { Token } from "./PolicyModuleParserTypes";
import { PolicyModuleTokenType } from "./PolicyModuleTokenType";
import RootNode from "./RootNode";

class PolicyModuleParser {
    private static SIMPLE_TOKENS = {
        "{": PolicyModuleTokenType.BraceOpen,
        "}": PolicyModuleTokenType.BraceClose,
        ";": PolicyModuleTokenType.Semicolon,
        ",": PolicyModuleTokenType.Comma
    };

    private static KEYWORDS = {
        allow: PolicyModuleTokenType.Allow,
        deny: PolicyModuleTokenType.Deny,
        require: PolicyModuleTokenType.Require,
        module: PolicyModuleTokenType.Module,
        label: PolicyModuleTokenType.Label,
        labels: PolicyModuleTokenType.Labels,
        type: PolicyModuleTokenType.Type
    };

    private tokenIndex = 0;
    private tokens: Token[] = [];

    public parse(content: string) {
        this.tokens = this.lex(content);
        return this.parseStatements();
    }

    private consume() {
        return this.tokens[this.tokenIndex++];
    }

    private peek() {
        return this.tokens[this.tokenIndex];
    }

    private expect(type: PolicyModuleTokenType | PolicyModuleTokenType[]) {
        if (!(Array.isArray(type) ? type : [type]).includes(this.tokens[this.tokenIndex].type)) {
            throw new PolicyModuleParserError(
                `Expected ${type}, found ${this.tokens[this.tokenIndex].type}`,
                this.tokens[this.tokenIndex].loc
            );
        }

        return this.consume();
    }

    private isEOF() {
        return this.peek().type === PolicyModuleTokenType.EndOfFile;
    }

    private parseStatements(): RootNode {
        const children: Node[] = [];

        while (!this.isEOF()) {
            const statement = this.parseStatement();
            children.push(statement);
        }

        return new RootNode(
            children,
            children[0]?.range || {
                start: [0, 1, 1],
                end: [0, 1, 1]
            }
        );
    }

    private parseStatement(): Node {
        const token = this.peek();
        let statement: Node;

        switch (token.type) {
            case PolicyModuleTokenType.Allow:
            case PolicyModuleTokenType.Deny:
                statement = this.parseAllowDenyStatement();
                break;

            default:
                throw new PolicyModuleParserError(`Unexpected token ${token.type}`, token.loc);
        }

        while (this.peek().type === PolicyModuleTokenType.Semicolon) {
            this.consume();
        }

        return statement;
    }

    private parseAllowDenyStatement(): Node {
        const first = this.expect([PolicyModuleTokenType.Allow, PolicyModuleTokenType.Deny]);
        const subject = this.expect(PolicyModuleTokenType.Identifier).value;
        const target = this.expect(PolicyModuleTokenType.Identifier).value;
        const permissions: string[] = [];

        this.expect(PolicyModuleTokenType.BraceOpen);

        while (this.peek().type === PolicyModuleTokenType.Identifier) {
            permissions.push(this.expect(PolicyModuleTokenType.Identifier).value);

            if (this.peek().type === PolicyModuleTokenType.Comma) {
                this.consume();
            }
        }

        const last = this.expect(PolicyModuleTokenType.BraceClose);

        return new AllowDenyStatementNode(
            first.type === PolicyModuleTokenType.Allow ? "allow" : "deny",
            subject,
            target,
            permissions,
            {
                start: first.loc.start,
                end: last.loc.end
            }
        );
    }

    public lex(content: string) {
        let i = 0;
        let line = 1,
            column = 1;
        const tokens: Token[] = [];

        while (i < content.length) {
            while (i < content.length && /\s+/.test(content[i])) {
                if (content[i].includes("\n") || content[i].includes("\r")) {
                    line++;
                    column = 1;
                }
                else {
                    column++;
                }

                i++;
            }

            if (i >= content.length) {
                break;
            }

            if (content[i] in PolicyModuleParser.SIMPLE_TOKENS) {
                tokens.push({
                    type: PolicyModuleParser.SIMPLE_TOKENS[content[i] as keyof typeof PolicyModuleParser.SIMPLE_TOKENS],
                    value: content[i],
                    loc: {
                        start: [i, line, column],
                        end: [++i, line, ++column]
                    }
                });

                continue;
            }

            if (content[i] === '"' || content[i] === "'") {
                let string = "";
                const start = [i, line, column] as const;
                const quote = content[i];

                i++;
                column++;

                while (i < content.length && content[i] !== quote) {
                    if (content[i] === "\\") {
                        switch (content[i + 1]) {
                            case "n":
                                string += "\n";
                                break;
                            case "r":
                                string += "\r";
                                break;
                            case "t":
                                string += "\t";
                                break;
                            case "f":
                                string += "\f";
                                break;
                            case "v":
                                string += "\v";
                                break;
                            case '"':
                                string += '"';
                                break;
                            case "'":
                                string += "'";
                                break;
                            default:
                                throw new PolicyModuleParserError(
                                    `Invalid escape sequence: '\\${content[i + 1] ?? ""}'`,
                                    [i, line, column]
                                );
                        }

                        i += 2;
                        column += 2;
                        continue;
                    }

                    while (i < content.length && /\s+/.test(content[i])) {
                        if (content[i].includes("\n") || content[i].includes("\r")) {
                            line++;
                            column = 1;
                        }
                        else {
                            column++;
                        }

                        i++;
                    }

                    if (i >= content.length) {
                        break;
                    }

                    string += content[i];
                    i++;
                    column++;
                }

                if (content[i] !== quote) {
                    throw new PolicyModuleParserError("Unterminated string literal", [i, line, column]);
                }

                i++;
                column++;

                tokens.push({
                    type: PolicyModuleTokenType.String,
                    value: string,
                    loc: {
                        start,
                        end: [i, line, column]
                    }
                });

                continue;
            }

            if (/^\d$/.test(content[i])) {
                let integer = "";
                const start = [i, line, column] as const;

                while (i < content.length && /^\d$/.test(content[i])) {
                    integer += content[i];
                    i++;
                    column++;
                }

                const intval = +integer;

                if (Number.isNaN(intval)) {
                    throw new PolicyModuleParserError(`Invalid integer value: ${intval}`, [i, line, column]);
                }

                tokens.push({
                    type: PolicyModuleTokenType.Integer,
                    value: intval.toString(),
                    loc: {
                        start,
                        end: [i, line, column]
                    }
                });

                continue;
            }

            if (/^[A-Za-z_$]$/.test(content[i])) {
                let identifier = "";
                const start = [i, line, column] as const;

                while (i < content.length && /^[A-Za-z0-9_$]$/.test(content[i])) {
                    identifier += content[i];
                    i++;
                    column++;
                }

                tokens.push({
                    type:
                        identifier in PolicyModuleParser.KEYWORDS
                            ? PolicyModuleParser.KEYWORDS[identifier as keyof typeof PolicyModuleParser.KEYWORDS]
                            : PolicyModuleTokenType.Identifier,
                    value: identifier,
                    loc: {
                        start,
                        end: [i, line, column]
                    }
                });

                continue;
            }

            throw new PolicyModuleParserError(`Unexpected token '${content[i] || "[unknown]"}'`, [i, line, column]);
        }

        tokens.push({
            type: PolicyModuleTokenType.EndOfFile,
            value: "EOF",
            loc: {
                start: [i, line, column],
                end: [i, line, column]
            }
        });

        return tokens;
    }
}

export default PolicyModuleParser;
