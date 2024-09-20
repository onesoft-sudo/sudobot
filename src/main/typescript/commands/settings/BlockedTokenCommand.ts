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
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import Pagination from "@framework/widgets/Pagination";
import RuleModerationService from "@main/automod/RuleModerationService";
import { Colors } from "@main/constants/Colors";
import ConfigurationManager from "@main/services/ConfigurationManager";
import {
    type APIEmbed,
    type ChatInputCommandInteraction,
    escapeMarkdown,
    type MessagePayload
} from "discord.js";

class BlockedTokenCommand extends Command {
    public override readonly name = "blockedtoken";
    public override readonly description: string = "Manage blocked tokens.";
    public override readonly defer = true;
    public override readonly usage = [
        '<subcommand: "add"> <...token: RestString>',
        '<subcommand: "remove"> <...token: RestString>',
        '<subcommand: "list">'
    ];
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly aliases = ["blockedtokens"];

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
                        .setDescription("Add a blocked token.")
                        .addStringOption(option =>
                            option
                                .setName("token")
                                .setDescription("The token to block.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Remove a blocked token.")
                        .addStringOption(option =>
                            option
                                .setName("token")
                                .setDescription("The token to remove.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand.setName("list").setDescription("List all blocked tokens.")
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
                const token = context.isChatInput()
                    ? context.options.getString("token", true)
                    : context.commandContent
                          .slice(context.argv[0].length)
                          .trim()
                          .slice(context.argv[1].length)
                          .trim();

                if (!token) {
                    return void (await context.error("You must provide a token to block!"));
                }

                rule.tokens.push(token);
                await this.configManager.write({ system: false, guild: true });
                await context.success("Successfully blocked the given token.");
                break;
            }
            case "remove": {
                const token = context.isChatInput()
                    ? context.options.getString("token", true)
                    : context.commandContent
                          .slice(context.argv[0].length)
                          .trim()
                          .slice(context.argv[1].length)
                          .trim();

                if (!token) {
                    return void (await context.error("You must provide a token to unblock!"));
                }

                const index = rule.tokens.indexOf(token);

                if (index === -1) {
                    return void (await context.error("The given token is not in the blocklist!"));
                }

                rule.tokens.splice(index, 1);
                await this.configManager.write({ system: false, guild: true });
                await context.success("Successfully unblocked the given token.");
                break;
            }
            case "list": {
                const { tokens } = rule;

                if (tokens.length === 0) {
                    await context.error("There are no blocked tokens in this server!");
                    return;
                }

                const pagination: Pagination<string> = Pagination.withData(tokens)
                    .setLimit(10)
                    .setMaxTimeout(Pagination.DEFAULT_TIMEOUT)
                    .setMessageOptionsBuilder(({ data, maxPages, page }) => {
                        return {
                            embeds: [
                                {
                                    author: {
                                        name: `Blocked tokens in ${context.guild.name}`,
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
                                        text: `Page ${page} of ${maxPages} • ${tokens.length} tokens total`
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

export default BlockedTokenCommand;
