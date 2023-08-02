/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { EmbedBuilder, Message, PermissionFlagsBits, SlashCommandBuilder, Snowflake, escapeMarkdown } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";

export default class BlockedTokenCommand extends Command {
    public readonly subcommandsCustom = ["add", "remove", "has", "list"];
    public readonly name = "blockedtoken";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            requiredErrorMessage: `Please provide a subcommand! The valid subcommands are: \`${this.subcommandsCustom.join("`, `")}\`.`,
            typeErrorMessage: `Please provide a __valid__ subcommand! The valid subcommands are: \`${this.subcommandsCustom.join("`, `")}\`.`,
            name: "subcommand"
        }
    ];

    public readonly permissions = [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.BanMembers];
    public readonly permissionMode = "or";

    public readonly description = "Manage blocked tokens.";
    public readonly detailedDescription =
        "Add/remove/check/view the blocked tokens. All arguments, separated by spaces will also be treated as a single token.";

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Adds a blocked token")
                .addStringOption(option => option.setName("token").setDescription("The token to block").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove blocked token")
                .addStringOption(option => option.setName("token").setDescription("The token to remove from blocklist").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("has")
                .setDescription("Check if a blocked token exists in the blocklist")
                .addStringOption(option => option.setName("token").setDescription("The token to check").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName("list").setDescription("Show the blocked token list"));
    public readonly aliases = ["blockedtokens"];

    createConfigIfNotExists(guildId: Snowflake) {
        this.client.configManager.config[guildId!]!.message_filter ??= {
            enabled: true,
            delete_message: true,
            send_logs: true
        };

        this.client.configManager.config[guildId!]!.message_filter!.data ??= {
            blocked_tokens: [],
            blocked_words: []
        };

        this.client.configManager.config[guildId!]!.message_filter!.data!.blocked_tokens ??= [];
    }

    getToken(message: CommandMessage, subcommand: string, context: AnyCommandContext) {
        return context.isLegacy
            ? (message as Message).content
                  .slice(this.client.configManager.config[message.guildId!]?.prefix.length)
                  .trimStart()
                  .slice(context.argv[0].length)
                  .trimStart()
                  .slice(subcommand.length)
                  .trimStart()
            : context.options.getString("token", true);
    }

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const subcommand = (context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true))?.toString();

        if (!this.subcommandsCustom.includes(subcommand)) {
            await this.error(message, `Invalid subcommand provided. The valid subcommands are: \`${this.subcommandsCustom.join("`, `")}\`.`);
            return;
        }

        if (context.isLegacy && context.args[1] === undefined && subcommand !== "list") {
            await this.error(
                message,
                `You must specify a token ${subcommand === "add" ? "to block" : subcommand === "remove" ? "to remove" : "to check"}!`
            );
            return;
        }

        if (!this.client.configManager.config[message.guildId!]) {
            return;
        }

        await this.deferIfInteraction(message);

        if (context.isLegacy) {
            context.args.shift();
        }

        this.createConfigIfNotExists(message.guildId!);

        switch (subcommand) {
            case "add":
                {
                    const token = this.getToken(message, subcommand, context);

                    if (!this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_tokens.includes(token)) {
                        this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_tokens.push(token);
                        await this.client.configManager.write();
                    }

                    await this.success(message, `The given token(s) have been blocked.`);
                }
                break;

            case "has": {
                const token = this.getToken(message, subcommand, context);

                if (this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_tokens.includes(token)) {
                    await this.success(message, `This token is in the blocklist.`);
                } else {
                    await this.error(message, `This token is not in the blocklist.`);
                }

                return;
            }

            case "remove":
                const token = this.getToken(message, subcommand, context);
                const index = this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_tokens.indexOf(token);

                if (index && index !== -1) {
                    this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_tokens.splice(index, 1);
                    await this.client.configManager.write();
                }

                await this.success(message, `The given token(s) have been unblocked.`);
                break;

            case "list":
                {
                    const token: string[] = this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_tokens ?? [];
                    const safeTokens: string[][] = [];
                    let length = 0;

                    for (const unsafeToken of token) {
                        if (safeTokens.length === 0) safeTokens.push([]);

                        const token = escapeMarkdown(unsafeToken);

                        if (length + token.length >= 3000) {
                            safeTokens.push([token]);
                            length = token.length;
                            continue;
                        }

                        const index = safeTokens.length - 1;

                        safeTokens[index].push(token);
                        length += token.length;
                    }

                    const pagination = new Pagination(safeTokens, {
                        channelId: message.channelId!,
                        guildId: message.guildId!,
                        limit: 1,
                        timeout: 120_000,
                        userId: message.member!.user.id,
                        client: this.client,
                        embedBuilder({ currentPage, data, maxPages }) {
                            return new EmbedBuilder({
                                author: {
                                    name: `Blocked tokens in ${message.guild!.name}`,
                                    iconURL: message.guild!.iconURL() ?? undefined
                                },
                                color: 0x007bff,
                                description: "`" + data[0].join("`\n`") + "`",
                                footer: {
                                    text: `Page ${currentPage} of ${maxPages}`
                                }
                            });
                        }
                    });

                    let reply = await this.deferredReply(message, await pagination.getMessageOptions());
                    await pagination.start(reply);
                }

                break;
        }
    }
}
