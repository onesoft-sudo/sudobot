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
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";

export default class BlockedMessageCommand extends Command {
    public readonly subcommandsCustom = ["add", "remove", "has", "list"];
    public readonly name = "blockedmessage";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            errors: {
                required: `Please provide a subcommand! The valid subcommands are: \`${this.subcommandsCustom.join("`, `")}\`.`,
                "type:invalid": `Please provide a __valid__ subcommand! The valid subcommands are: \`${this.subcommandsCustom.join(
                    "`, `"
                )}\`.`
            },
            name: "subcommand"
        }
    ];
    public readonly permissions = [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.BanMembers];
    public readonly permissionMode = "or";

    public readonly description = "Manage blocked messages.";

    public readonly detailedDescription = [
        "Add/remove/check/view the blocked messages. All arguments, separated by spaces will be treated as different messages.\n",
        "**Subcommands**",
        "* `add <...messages>` - Add blocked message(s)",
        "* `remove <...messages>` - Remove blocked message(s)",
        "* `has <message>` - Check if the given message is blocked",
        "* `list` - List all the blocked messages"
    ].join("\n");

    public readonly argumentSyntaxes = ["<subcommand> [...args]"];

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add a blocked message")
                .addStringOption(option => option.setName("message").setDescription("The message to block").setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove blocked message")
                .addStringOption(option =>
                    option.setName("message").setDescription("The message to remove from blocklist").setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("has")
                .setDescription("Check if a blocked message exists in the blocklist")
                .addStringOption(option => option.setName("message").setDescription("The message to check").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand.setName("list").setDescription("Show the blocked message list"));
    public readonly aliases = ["blockedmessages"];

    createConfigIfNotExists(guildId: Snowflake) {
        this.client.configManager.config[guildId!]!.message_filter ??= {
            enabled: true,
            delete_message: true,
            send_logs: true
        } as any;

        this.client.configManager.config[guildId!]!.message_filter!.data ??= {
            blocked_tokens: [],
            blocked_words: [],
            blocked_messages: []
        };

        this.client.configManager.config[guildId!]!.message_filter!.data!.blocked_messages ??= [];
    }

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const subcommand = (
            context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true)
        )?.toString();

        if (!this.subcommandsCustom.includes(subcommand)) {
            await this.error(
                message,
                `Invalid subcommand provided. The valid subcommands are: \`${this.subcommandsCustom.join("`, `")}\`.`
            );
            return;
        }

        if (context.isLegacy && context.args[1] === undefined && subcommand !== "list") {
            await this.error(
                message,
                `You must specify a message ${
                    subcommand === "add" ? "to block" : subcommand === "remove" ? "to remove" : "to check"
                }!`
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
                const messageToBlock = context.isLegacy ? context.args[0] : context.options.getString("message", true);

                if (
                    !this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_messages.includes(
                        messageToBlock
                    )
                ) {
                    this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_messages.push(
                        messageToBlock
                    );
                }

                await this.client.configManager.write();
                await this.success(message, `The given message has been blocked.`);
                break;

            case "has":
                const messageToCheck = context.isLegacy ? context.args[0] : context.options.getString("message", true);

                if (
                    this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_messages.includes(
                        messageToCheck
                    )
                ) {
                    await this.success(message, `This message is in the blocklist.`);
                } else {
                    await this.error(message, `This message is not in the blocklist.`);
                }

                return;

            case "remove":
                const messageToRemove = context.isLegacy ? context.args[0] : context.options.getString("message", true);

                const index =
                    this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_messages.indexOf(
                        messageToRemove
                    );

                if (!index || index === -1) {
                    return;
                }

                this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_messages.splice(index, 1);

                await this.client.configManager.write();
                await this.success(message, `The given message has been unblocked.`);
                break;

            case "list":
                {
                    const messages: string[] =
                        this.client.configManager.config[message.guildId!]?.message_filter?.data?.blocked_messages ?? [];
                    const safeMessages: string[][] = [];
                    let length = 0;

                    for (const unsafeMessage of messages) {
                        if (safeMessages.length === 0) safeMessages.push([]);

                        const theMessage = escapeMarkdown(unsafeMessage);

                        if (length + theMessage.length >= 3000) {
                            safeMessages.push([theMessage]);
                            length = theMessage.length;
                            continue;
                        }

                        const index = safeMessages.length - 1;

                        safeMessages[index].push(theMessage);
                        length += theMessage.length;
                    }

                    const pagination = new Pagination(safeMessages, {
                        channelId: message.channelId!,
                        guildId: message.guildId!,
                        limit: 1,
                        timeout: 120_000,
                        userId: message.member!.user.id,
                        client: this.client,
                        embedBuilder({ currentPage, data, maxPages }) {
                            return new EmbedBuilder({
                                author: {
                                    name: `Blocked messages in ${message.guild!.name}`,
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
