/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type InteractionContext from "@framework/commands/InteractionContext";
import type LegacyContext from "@framework/commands/LegacyContext";
import { Inject } from "@framework/container/Inject";
import Pagination from "@framework/pagination/Pagination";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import RuleModerationService from "@main/automod/RuleModerationService";
import { Colors } from "@main/constants/Colors";
import ConfigurationManager from "@main/services/ConfigurationManager";
import {
    type APIEmbed,
    type ChatInputCommandInteraction,
    escapeMarkdown,
    type MessagePayload
} from "discord.js";

class BlockedWordCommand extends Command {
    public override readonly name = "blockedword";
    public override readonly description: string = "Manage blocked words.";
    public override readonly defer = true;
    public override readonly usage = [
        '<subcommand: "add"> <...words: String[]>',
        '<subcommand: "remove"> <...words: String[]>',
        '<subcommand: "list">'
    ];
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly aliases = ["blockedwords"];

    @Inject()
    private readonly configManager!: ConfigurationManager;

    @Inject()
    private readonly ruleModerationService!: RuleModerationService;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Adds blocked words separated by spaces.")
                        .addStringOption(option =>
                            option
                                .setName("words")
                                .setDescription("The words to block.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Removes blocked words.")
                        .addStringOption(option =>
                            option
                                .setName("words")
                                .setDescription("The words to remove.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName("list").setDescription("List all blocked words.")
                )
        ];
    }

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>
    ): Promise<void> {
        const subcommand = context.isChatInput()
            ? context.options.getSubcommand(true)
            : context.argv[1];

        if (!["add", "remove", "list"].includes(subcommand)) {
            return void (await context.error(
                "Invalid subcommand provided! Must be one of `add`, `remove`, or `list`."
            ));
        }

        if (!this.configManager.config[context.guildId]?.rule_moderation?.enabled) {
            return void (await context.error("Rule moderation is not enabled in this server!"));
        }

        const rule = this.ruleModerationService.getFirstWordFilterRuleOrCreate(context.guildId);

        if (!rule) {
            return void (await context.error("Failed to read the details of word filter rule!"));
        }

        switch (subcommand) {
            case "add": {
                const words = context.isChatInput()
                    ? context.options.getString("words", true).split(/\s+/)
                    : context.argv.slice(2);

                if (!words?.length) {
                    return void (await context.error(
                        "You must provide at least one word to block!"
                    ));
                }

                rule.words.push(...words);
                await this.configManager.write({ system: false, guild: true });
                await context.success("Successfully blocked the given word(s).");
                break;
            }
            case "remove": {
                const words = context.isChatInput()
                    ? context.options.getString("words", true).split(/\s+/)
                    : context.argv.slice(2);

                if (!words?.length) {
                    return void (await context.error(
                        "You must provide at least one word to unblock!"
                    ));
                }

                for (const word of words) {
                    const index = rule.words.indexOf(word);

                    if (index === -1) {
                        return void (await context.error(`The word \`${word}\` is not blocked!`));
                    }

                    rule.words.splice(index, 1);
                }

                await this.configManager.write({ system: false, guild: true });
                await context.success("Successfully unblocked the given word(s).");
                break;
            }
            case "list": {
                const { words } = rule;

                if (words.length === 0) {
                    await context.error("There are no blocked words in this server!");
                    return;
                }

                const pagination: Pagination<string> = Pagination.withData(words)
                    .setLimit(10)
                    .setMaxTimeout(Pagination.DEFAULT_TIMEOUT)
                    .setMessageOptionsBuilder(({ data, maxPages, page }) => {
                        return {
                            embeds: [
                                {
                                    author: {
                                        name: `Blocked words in ${context.guild.name}`,
                                        icon_url: context.guild.iconURL() ?? undefined
                                    },
                                    color: Colors.Primary,
                                    description: (Array.isArray(data) ? data : Array.from(data))
                                        .map(
                                            (token, index) =>
                                                `${index + 1}. ${escapeMarkdown(token)}`
                                        )
                                        .join("\n"),
                                    footer: {
                                        text: `Page ${page} of ${maxPages} • ${words.length} words total`
                                    }
                                } satisfies APIEmbed
                            ]
                        };
                    });

                const message = await context.reply(
                    (await pagination.getMessageOptions()) as unknown as MessagePayload
                );
                pagination.setInitialMessage(message);
                break;
            }
        }
    }
}

export default BlockedWordCommand;
