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

import AllowDenyStatementNode from "./ast/AllowDenyStatementNode";
import BinaryExpressionNode from "./ast/BinaryExpressionNode";
import BlockStatementNode from "./ast/BlockStatementNode";
import LiteralNode, { LiteralKind } from "./ast/LiteralNode";
import ModuleBlockPropertyNode from "./ast/ModuleBlockPropertyNode";
import ModuleBlockStatementNode from "./ast/ModuleBlockStatementNode";
import type Node from "./ast/Node";
import PolicyModuleParserError from "./PolicyModuleParserError";
import type { Token } from "./PolicyModuleParserTypes";
import { PolicyModuleTokenType } from "./PolicyModuleTokenType";
import RootNode from "./ast/RootNode";
import RequireBlockStatementNode from "./ast/RequireBlockStatementNode";
import RequireTypeStatementNode from "./ast/RequireTypeStatementNode";

class PolicyModuleParser {
    private static SIMPLE_TOKENS = {
        "{": PolicyModuleTokenType.BraceOpen,
        "}": PolicyModuleTokenType.BraceClose,
        ";": PolicyModuleTokenType.Semicolon,
        ",": PolicyModuleTokenType.Comma,
        "+": PolicyModuleTokenType.Plus,
        "-": PolicyModuleTokenType.Minus,
        "*": PolicyModuleTokenType.Times,
        "/": PolicyModuleTokenType.Slash,
        "%": PolicyModuleTokenType.Percent,
    };

    private static KEYWORDS = {
        allow: PolicyModuleTokenType.Allow,
        deny: PolicyModuleTokenType.Deny,
        require: PolicyModuleTokenType.Require,
        module: PolicyModuleTokenType.Module,
        label: PolicyModuleTokenType.Label,
        labels: PolicyModuleTokenType.Labels,
        type: PolicyModuleTokenType.Type,
        true: PolicyModuleTokenType.True,
        false: PolicyModuleTokenType.False
    };

    private tokenIndex = 0;
    private tokens: Token[] = [];

    public reset() {
        this.tokens = [];
        this.tokenIndex = 0;
    }

    public parse(content: string) {
        this.reset();
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
        let moduleParsed = false;

        while (!this.isEOF()) {
            const statement = this.parseStatement();
            children.push(statement);

            if (statement instanceof ModuleBlockStatementNode) {
                if (!moduleParsed) {
                    moduleParsed = true;
                }
                else {
                    throw new PolicyModuleParserError(
                        "Multiple 'module' block declarations are not allowed",
                        statement.range
                    );
                }
            }
        }

        return new RootNode(
            children,
            children[0]?.range || {
                start: [0, 1, 1],
                end: [0, 1, 1]
            }
        );
    }

    private parseRequireBlockStatement(): Node {
        const token = this.peek();
        let statement: Node;

        switch (token.type) {
            case PolicyModuleTokenType.Type:
                statement = this.parseRequireTypeStatement();
                break;

            default:
                throw new PolicyModuleParserError(`Unexpected token ${token.type}`, token.loc);
        }

        while (this.peek().type === PolicyModuleTokenType.Semicolon) {
            this.consume();
        }

        return statement;
    }

    private parseModuleBlockStatement(): Node {
        const token = this.peek();
        let statement: Node;

        switch (token.type) {
            case PolicyModuleTokenType.Identifier:
                statement = this.parseModuleBlockDeclaration();
                break;

            default:
                throw new PolicyModuleParserError(`Unexpected token ${token.type}`, token.loc);
        }

        while (this.peek().type === PolicyModuleTokenType.Semicolon) {
            this.consume();
        }

        return statement;
    }

    private parseRequireTypeStatement(): Node {
        const start = this.expect(PolicyModuleTokenType.Type);
        const identifier = this.expect(PolicyModuleTokenType.Identifier);
        return new RequireTypeStatementNode(identifier.value, {
            start: start.loc.start,
            end: identifier.loc.end
        });
    }

    private parseModuleBlockDeclaration(): Node {
        const identifier = this.expect(PolicyModuleTokenType.Identifier);
        const value = this.parseExpression();

        if (!(value instanceof BinaryExpressionNode) && !(value instanceof LiteralNode)) {
            throw new PolicyModuleParserError(
                "Invalid module declaration: value must be a folable expression or literal",
                value.range
            );
        }

        const folded = this.foldExpression(value);

        function expectValueType<K extends LiteralKind>(
            folded: LiteralNode,
            kind: K
        ): asserts folded is LiteralNode & { kind: K } {
            if (folded.kind !== kind) {
                throw new PolicyModuleParserError(
                    `Invalid module declaration: value of '${identifier.value}' must be of type ${LiteralKind[kind]}, but found ${LiteralKind[folded.kind]}`,
                    value.range
                );
            }
        }

        switch (identifier.value) {
            case "name":
            case "author":
                expectValueType(folded, LiteralKind.String);
                return new ModuleBlockPropertyNode(identifier.value, folded, {
                    start: identifier.loc.start,
                    end: value.range.end
                });

            case "version":
                expectValueType(folded, LiteralKind.Integer);
                return new ModuleBlockPropertyNode(identifier.value, folded, {
                    start: identifier.loc.start,
                    end: value.range.end
                });

            default:
                throw new PolicyModuleParserError(
                    `Invalid module declaration: Invalid property '${identifier.value}'`,
                    value.range
                );
        }
    }

    private foldExpression(expression: BinaryExpressionNode | LiteralNode): LiteralNode {
        if (expression instanceof LiteralNode) {
            return expression;
        }

        const left = this.foldExpression(expression.left as BinaryExpressionNode | LiteralNode);
        const right = this.foldExpression(expression.right as BinaryExpressionNode | LiteralNode);

        const expectNumber = () => {
            if (left.kind !== LiteralKind.Integer || right.kind !== LiteralKind.Integer) {
                throw new PolicyModuleParserError(
                    "Invalid binary expression: both sides must be numeric",
                    expression.range
                );
            }
        };

        switch (expression.operator) {
            case "+":
                expectNumber();
                return new LiteralNode(LiteralKind.Integer, (+left.value + +right.value).toString(), expression.range);

            case "-":
                expectNumber();
                return new LiteralNode(LiteralKind.Integer, (+left.value - +right.value).toString(), expression.range);

            case "*":
                expectNumber();
                return new LiteralNode(LiteralKind.Integer, (+left.value * +right.value).toString(), expression.range);

            case "/":
                expectNumber();
                return new LiteralNode(
                    LiteralKind.Integer,
                    Math.floor(+left.value / +right.value).toString(),
                    expression.range
                );

            case "%":
                expectNumber();
                return new LiteralNode(LiteralKind.Integer, (+left.value % +right.value).toString(), expression.range);

            default:
                throw new PolicyModuleParserError(`Unsupported operator: ${expression.operator}`, expression.range);
        }
    }

    private parseExpression(): Node {
        return this.parseAdditiveExpression();
    }

    private parseAdditiveExpression(): Node {
        let left: Node = this.parseMultiplicativeExpression();
        const start = left;

        while ([PolicyModuleTokenType.Plus, PolicyModuleTokenType.Minus].includes(this.tokens[this.tokenIndex].type)) {
            const operatorToken = this.tokens[this.tokenIndex];
            const operator =
                operatorToken.type === PolicyModuleTokenType.Plus
                    ? "+"
                    : operatorToken.type === PolicyModuleTokenType.Minus
                      ? "-"
                      : "?";

            if (operator === "?") {
                throw new PolicyModuleParserError(`Unexpected token ${operatorToken.type}`, operatorToken.loc);
            }

            this.consume();
            const right = this.parseMultiplicativeExpression();
            left = new BinaryExpressionNode(left, right, operator, {
                start: start.range.start,
                end: right.range.end
            });
        }

        return left;
    }

    private parseMultiplicativeExpression(): Node {
        let left: Node = this.parseSimpleExpression();
        const start = left;

        while (
            [PolicyModuleTokenType.Times, PolicyModuleTokenType.Slash, PolicyModuleTokenType.Percent].includes(
                this.tokens[this.tokenIndex].type
            )
        ) {
            const operatorToken = this.tokens[this.tokenIndex];
            const operator =
                operatorToken.type === PolicyModuleTokenType.Times
                    ? "*"
                    : operatorToken.type === PolicyModuleTokenType.Slash
                      ? "/"
                      : operatorToken.type === PolicyModuleTokenType.Percent
                        ? "%"
                        : "?";

            if (operator === "?") {
                throw new PolicyModuleParserError(`Unexpected token ${operatorToken.type}`, operatorToken.loc);
            }

            this.consume();
            const right = this.parseSimpleExpression();
            left = new BinaryExpressionNode(left, right, operator, {
                start: start.range.start,
                end: right.range.end
            });
        }

        return left;
    }

    private parseSimpleExpression(): Node {
        const start = this.consume();

        switch (start.type) {
            case PolicyModuleTokenType.Integer:
                return new LiteralNode(LiteralKind.Integer, start.value, start.loc);

            case PolicyModuleTokenType.String:
                return new LiteralNode(LiteralKind.String, start.value, start.loc);

            case PolicyModuleTokenType.True:
            case PolicyModuleTokenType.False:
                return new LiteralNode(LiteralKind.Boolean, start.value, start.loc);
        }

        throw new PolicyModuleParserError(`Unexpected token ${start.type}`, start.loc);
    }

    private parseStatement(): Node {
        const token = this.peek();
        let statement: Node;

        switch (token.type) {
            case PolicyModuleTokenType.Allow:
            case PolicyModuleTokenType.Deny:
                statement = this.parseAllowDenyStatement();
                break;

            case PolicyModuleTokenType.Module:
                statement = this.parseModuleBlock();
                break;

            case PolicyModuleTokenType.Require:
                statement = this.parseRequireBlock();
                break;

            default:
                throw new PolicyModuleParserError(`Unexpected token ${token.type}`, token.loc);
        }

        while (this.peek().type === PolicyModuleTokenType.Semicolon) {
            this.consume();
        }

        return statement;
    }

    private parseBlock<T extends Node>(callback: () => T): BlockStatementNode {
        const start = this.expect(PolicyModuleTokenType.BraceOpen);
        const children: T[] = [];

        while (!this.isEOF() && this.peek().type !== PolicyModuleTokenType.BraceClose) {
            const statement = callback();
            children.push(statement);
        }

        const end = this.expect(PolicyModuleTokenType.BraceClose);

        return new BlockStatementNode<T>(children, {
            start: start.loc.start,
            end: end.loc.end
        });
    }

    private parseModuleBlock(): Node {
        const start = this.expect(PolicyModuleTokenType.Module);
        const block = this.parseBlock(() => {
            return this.parseModuleBlockStatement();
        });

        return new ModuleBlockStatementNode(block as BlockStatementNode<ModuleBlockPropertyNode>, {
            start: start.loc.start,
            end: block.range.end
        });
    }

    private parseRequireBlock(): Node {
        const start = this.expect(PolicyModuleTokenType.Require);
        const block = this.parseBlock(() => {
            return this.parseRequireBlockStatement();
        });

        return new RequireBlockStatementNode(block as BlockStatementNode<RequireTypeStatementNode>, {
            start: start.loc.start,
            end: block.range.end
        });
    }

    private parseAllowDenyStatement(): Node {
        const first = this.expect([PolicyModuleTokenType.Allow, PolicyModuleTokenType.Deny]);
        const subject = this.expect(PolicyModuleTokenType.Identifier).value;
        const { value, type } = this.expect([PolicyModuleTokenType.Identifier, PolicyModuleTokenType.Times]);
        const permissions: string[] = [];

        this.expect(PolicyModuleTokenType.BraceOpen);

        while (this.peek().type === PolicyModuleTokenType.Identifier) {
            permissions.push(this.expect(PolicyModuleTokenType.Identifier).value);

            if (this.peek().type === PolicyModuleTokenType.Comma) {
                this.consume();
            }
        }

        const last = this.expect(PolicyModuleTokenType.BraceClose);
        const target = type === PolicyModuleTokenType.Times ? "*" : value;

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

                    if (i >= content.length) {
                        break;
                    }

                    if (content[i].includes("\n") || content[i].includes("\r")) {
                        line++;
                        column = 1;
                    }
                    else {
                        column++;
                    }

                    string += content[i];
                    i++;
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
