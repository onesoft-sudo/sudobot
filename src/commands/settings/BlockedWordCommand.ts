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

import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, Snowflake, escapeMarkdown } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";

export default class BlockedWordCommand extends Command {
    public readonly subcommandsCustom = ["add", "remove", "has", "list"];
    public readonly name = "blockedword";
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

    public readonly description = "Manage blocked words.";

    public readonly detailedDescription = [
        "Add/remove/check/view the blocked words. All arguments, separated by spaces will be treated as different words.\n",
        "**Subcommands**",
        "* `add <...words>` - Add blocked word(s)",
        "* `remove <...words>` - Remove blocked word(s)",
        "* `has <word>` - Check if the given word is blocked",
        "* `list` - List all the blocked words"
    ].join("\n");

    public readonly argumentSyntaxes = ["<subcommand> [...args]"];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add blocked words")
                .addStringOption(option => option.setName("words").setDescription("The words to block").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove blocked words")
                .addStringOption(option => option.setName("words").setDescription("The words to remove from blocklist").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("has")
                .setDescription("Check if a blocked word exists in the blocklist")
                .addStringOption(option => option.setName("word").setDescription("The word to check").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName("list").setDescription("Show the blocked word list"));
    public readonly aliases = ["blockedwords"];

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

        this.client.configManager.config[guildId!]!.message_filter!.data!.blocked_words ??= [];
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
                `You must specify a word ${subcommand === "add" ? "to block" : subcommand === "remove" ? "to remove" : "to check"}!`
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
                const words = context.isLegacy ? context.args : context.options.getString("words", true).split(/ +/);

                for await (const word of words) {
                    if (this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_words.includes(word)) {
                        continue;
                    }

                    this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_words.push(word);
                }

                await this.client.configManager.write();
                await this.success(message, `The given word(s) have been blocked.`);
                break;

            case "has":
                const word = context.isLegacy ? context.args[0] : context.options.getString("word", true);

                if (this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_words.includes(word)) {
                    await this.success(message, `This word is in the blocklist.`);
                } else {
                    await this.error(message, `This word is not in the blocklist.`);
                }

                return;

            case "remove":
                const wordsToRemove = context.isLegacy ? context.args : context.options.getString("words", true).split(/ +/);

                for await (const word of wordsToRemove) {
                    const index = this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_words.indexOf(word);

                    if (!index || index === -1) {
                        continue;
                    }

                    this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_words.splice(index, 1);
                }

                await this.client.configManager.write();
                await this.success(message, `The given word(s) have been unblocked.`);
                break;

            case "list":
                {
                    const words: string[] = this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_words ?? [];
                    const safeWords: string[][] = [];
                    let length = 0;

                    for (const unsafeWord of words) {
                        if (safeWords.length === 0) safeWords.push([]);

                        const word = escapeMarkdown(unsafeWord);

                        if (length + word.length >= 3000) {
                            safeWords.push([word]);
                            length = word.length;
                            continue;
                        }

                        const index = safeWords.length - 1;

                        safeWords[index].push(word);
                        length += word.length;
                    }

                    const pagination = new Pagination(safeWords, {
                        channelId: message.channelId!,
                        guildId: message.guildId!,
                        limit: 1,
                        timeout: 120_000,
                        userId: message.member!.user.id,
                        client: this.client,
                        embedBuilder({ currentPage, data, maxPages }) {
                            return new EmbedBuilder({
                                author: {
                                    name: `Blocked words in ${message.guild!.name}`,
                                    iconURL: message.guild!.iconURL() ?? undefined
                                },
                                color: 0x007bff,
                                description: "`" + data[0].join("`, `") + "`",
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
