/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025, 2026 OSN Developers.
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

import Application from "@main/core/Application";
import MessageRule from "@main/moderation/MessageRule";
import type { RuleContext } from "@main/moderation/Rule";
import type { RuleConstructor } from "@main/moderation/RuleManager";
import RuleManager from "@main/moderation/RuleManager";
import type { RuleDefinitionByType, RuleType } from "@schemas/all";
import { RuleSchema } from "@schemas/all";
import { createMessage } from "@tests/mocks/discord";
import type { Awaitable, Message } from "discord.js";
import { Client } from "discord.js";
import { beforeEach, describe, it, test } from "vitest";

function createManager(
    application: Application,
    rules: RuleConstructor<RuleType, unknown>[]
) {
    const manager = new RuleManager(application);

    for (const rule of rules) {
        manager.register(rule);
    }

    return manager;
}

describe("RuleManager", () => {
    let application: Application;
    let client: Client;

    beforeEach(() => {
        application = new Application({
            projectRootDirectoryPath: "",
            rootDirectoryPath: "",
            version: "1.0.0"
        });
        client = new Client({ intents: [] });
        Object.defineProperty(application, "client", { value: client });
    });

    it("can execute basic rules correctly", async ({ expect }) => {
        class WordFilterRule extends MessageRule<"word_filter"> {
            public override readonly name = "word_filter";

            public override check(
                message: Message<boolean>,
                { definition }: RuleContext<"word_filter">
            ): Awaitable<boolean> {
                return !definition.words.some(word =>
                    message.content.includes(word)
                );
            }
        }

        const manager = createManager(application, [WordFilterRule as unknown as RuleConstructor<RuleType, unknown>]);

        const message1 = createMessage(client);
        Object.defineProperty(message1, "content", { value: "Clean message." });

        const message2 = createMessage(client);
        Object.defineProperty(message2, "content", {
            value: "Not so clean-badword message."
        });

        expect(
            (
                await manager.test({
                    rules: [
                        RuleSchema.parse({
                            type: "word_filter",
                            words: ["badword"],
                            actions: []
                        })
                    ],
                    message: message1
                })
            ).passed
        ).toBe(true);

        expect(
            (
                await manager.test({
                    rules: [
                        RuleSchema.parse({
                            type: "word_filter",
                            words: ["badword"],
                            actions: []
                        })
                    ],
                    message: message2
                })
            ).passed
        ).toBe(false);
    });

    test("rule definition options work correctly", async ({ expect }) => {
        class WordFilterRule extends MessageRule<"word_filter"> {
            public override readonly name = "word_filter";

            public override check(
                message: Message<boolean>,
                { definition }: RuleContext<"word_filter">
            ): Awaitable<boolean> {
                return !definition.words.some(word =>
                    message.content.includes(word)
                );
            }
        }

        const manager = createManager(application, [WordFilterRule as unknown as RuleConstructor<RuleType, unknown>]);

        const message2 = createMessage(client);
        Object.defineProperty(message2, "content", {
            value: "Not so clean-badword message."
        });

        expect(
            (
                await manager.test({
                    rules: [
                        RuleSchema.parse({
                            type: "word_filter",
                            words: ["badword"],
                            actions: [],
                            mode: "invert"
                        } satisfies Partial<
                            RuleDefinitionByType<"word_filter">
                        >)
                    ],
                    message: message2
                })
            ).passed
        ).toBe(true);

        expect(
            (
                await manager.test({
                    rules: [
                        RuleSchema.parse({
                            type: "word_filter",
                            words: ["badword"],
                            actions: []
                        } satisfies Partial<
                            RuleDefinitionByType<"word_filter">
                        >)
                    ],
                    message: message2
                })
            ).passed
        ).toBe(false);

        const message3 = createMessage(client);
        Object.defineProperty(message3, "content", {
            value: "Not so clean-badword message."
        });

        const message4 = createMessage(client);
        Object.defineProperty(message4, "content", {
            value: "anotherword message."
        });

        const message5 = createMessage(client);
        Object.defineProperty(message5, "content", {
            value: "anotherword but bypassme message."
        });

        const message6 = createMessage(client);
        Object.defineProperty(message6, "content", {
            value: "anotherword but bypassme stillruns message."
        });

        const message7 = createMessage(client);
        Object.defineProperty(message7, "content", {
            value: "anotherword but bypassme badword message."
        });

        const rules = [
            RuleSchema.parse({
                type: "word_filter",
                words: ["badword"],
                actions: []
            } satisfies Partial<RuleDefinitionByType<"word_filter">>),
            RuleSchema.parse({
                type: "word_filter",
                words: ["bypassme"],
                actions: [],
                mode: "invert",
                is_bypasser: true,
                bypasses: ["second_rule"]
            } satisfies Partial<RuleDefinitionByType<"word_filter">>),
            RuleSchema.parse({
                type: "word_filter",
                words: ["anotherword"],
                name: "second_rule",
                actions: []
            } satisfies Partial<RuleDefinitionByType<"word_filter">>),
            RuleSchema.parse({
                type: "word_filter",
                words: ["stillruns"],
                actions: []
            } satisfies Partial<RuleDefinitionByType<"word_filter">>)
        ];

        expect(
            (
                await manager.test({
                    rules,
                    message: message3
                })
            ).passed
        ).toBe(false);

        expect(
            (
                await manager.test({
                    rules,
                    message: message4
                })
            ).passed
        ).toBe(false);

        expect(
            (
                await manager.test({
                    rules,
                    message: message5
                })
            ).passed
        ).toBe(true);

        expect(
            (
                await manager.test({
                    rules,
                    message: message6
                })
            ).passed
        ).toBe(false);

        expect(
            (
                await manager.test({
                    rules,
                    message: message7
                })
            ).passed
        ).toBe(false);
    });
});
