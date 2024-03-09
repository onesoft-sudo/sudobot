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

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection,
    EmbedBuilder,
    PermissionResolvable,
    SlashCommandBuilder,
    escapeCodeBlock,
    escapeInlineCode
} from "discord.js";
import Command, {
    ArgumentType,
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { log } from "../../utils/Logger";
import Pagination from "../../utils/Pagination";
import { DOCS_URL, GITHUB_URL, WEBSITE_URL } from "../../utils/links";
import { forceGetPermissionNames, getComponentEmojiResolvable } from "../../utils/utils";

export interface CommandInfo {
    name: string;
    aliases: string[];
    group: string;
    description?: string;
    detailedDescription?: string;
    systemAdminOnly: boolean;
    beta: boolean;
    argumentSyntaxes?: string[];
    botRequiredPermissions?: PermissionResolvable[];
    availableOptions?: Record<string, string>;
    since: string;
    supportsInteractions: boolean;
    supportsLegacy: boolean;
}

export default class HelpCommand extends Command {
    public readonly name = "help";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "command",
            optional: true
        },
        {
            types: [ArgumentType.String],
            name: "subcommand",
            optional: true
        }
    ];
    public readonly permissions = [];

    public readonly description = "Shows this help information.";
    public readonly detailedDescription =
        "Shows documentation about the bot's commands. You can even get information about individual commands by running `help <command>` where `<command>` is the command name.";

    public readonly argumentSyntaxes = ["[command]"];

    public readonly commandInformation = new Collection<string, string[]>();
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option =>
            option.setName("command").setDescription("Shows help for this command")
        )
        .addStringOption(option =>
            option.setName("subcommand").setDescription("Shows help for this subcommand")
        );

    @GatewayEventListener("ready")
    async onReady() {
        log("Attempting to read and extract meta info from all the loaded commands...");

        for await (const command of this.client.commands.values()) {
            if (command.name.includes("__")) continue;
            const commands = this.commandInformation.get(command.group) ?? [];

            if (commands.includes(command.name)) {
                continue;
            }

            commands.push(command.name);
            this.commandInformation.set(command.group, commands);
        }

        for (const group of this.commandInformation.keys()) {
            this.commandInformation.get(group)?.sort((a, b) => a.localeCompare(b, ["en-US"]));
        }

        log("Successfully read metadata of " + this.commandInformation.size + " commands");
    }

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);
        const commandName = context.isLegacy
            ? context.parsedNamedArgs.command
            : context.options.getString("command");
        const subcommand = context.isLegacy
            ? context.parsedNamedArgs.subcommand
            : context.options.getString("subcommand");

        const config = this.client.configManager.config[message.guildId!];

        if (!config) {
            await this.error(
                message,
                "This server isn't configured. Please ask a system administrator to configure this server."
            );
            return;
        }

        if (!commandName) {
            const pagination = new Pagination([...this.commandInformation.entries()], {
                channelId: message.channelId!,
                client: this.client,
                guildId: message.guildId!,
                limit: 1,
                timeout: 200_000,
                userId: message.member!.user.id,
                embedBuilder: ({ currentPage, maxPages, data: [[group, commandNames]] }) => {
                    let description: string = `Run \`${config.prefix}help <commandName>\` to get help about a specific command.\n\`<...>\` means required argument, \`[...]\` means optional argument.\n\n`;
                    description += `**${group}**\n\`${commandNames.join("`, `")}\`\n\n`;

                    return new EmbedBuilder({
                        author: {
                            name: "Help",
                            iconURL: this.client.user?.displayAvatarURL() ?? undefined
                        },
                        color: 0x007bff,
                        description,
                        footer: {
                            text: `Page ${currentPage} of ${maxPages}`
                        }
                    }).setTimestamp();
                },
                messageOptions: {
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setEmoji("📘")
                                .setURL(DOCS_URL)
                                .setLabel("Documentation"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setEmoji(
                                    getComponentEmojiResolvable(this.client, "github") ?? "☄️"
                                )
                                .setURL(GITHUB_URL)
                                .setLabel("GitHub"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setEmoji("🌍")
                                .setURL(WEBSITE_URL)
                                .setLabel("Website")
                        )
                    ]
                }
            });

            const reply = await this.deferredReply(message, await pagination.getMessageOptions(1));
            await pagination.start(reply);
        } else {
            const name = subcommand ? `${commandName} ${subcommand}` : commandName;
            const rootCommandName = this.client.commands.get(commandName)?.name ?? commandName;
            const command =
                this.client.commands.get(
                    subcommand ? `${rootCommandName}__${subcommand}` : commandName
                ) ?? this.client.commands.get(commandName);
            const hasSubcommand =
                subcommand && this.client.commands.has(`${rootCommandName}__${subcommand}`);
            const subcommandMeta = hasSubcommand ? command : command?.subcommandsMeta[subcommand];

            if (
                (!subcommand && !command) ||
                (subcommand && !hasSubcommand && !command?.subcommandsMeta[subcommand])
            ) {
                await this.error(
                    message,
                    subcommand
                        ? `No command \`${commandName}\` or no subcommand \`${subcommand}\` exists.`
                        : `No command named \`${escapeInlineCode(
                              escapeCodeBlock(commandName)
                          )}\` exists!`
                );
                return;
            }

            const options =
                command?.availableOptions || subcommandMeta?.availableOptions
                    ? Object.entries(
                          subcommandMeta?.availableOptions ?? command?.availableOptions ?? {}
                      )
                    : [];

            await this.deferredReply(message, {
                embeds: [
                    new EmbedBuilder({
                        title: `${config.prefix}${name}${command?.beta ? " [BETA]" : ""}`,
                        color: 0x007bff,
                        fields: [
                            {
                                name: "Name",
                                value: `\`${(subcommand ? name : command?.name)?.replace(
                                    "__",
                                    " "
                                )}\``,
                                inline: true
                            },
                            {
                                name: "Group",
                                value: `\`${command?.group}\``,
                                inline: true
                            },
                            ...(command?.aliases.length
                                ? [
                                      {
                                          name: "Aliases",
                                          value: command?.aliases
                                              ?.filter(c => c !== command?.name && c !== name)

                                              .map(c => `\`${c.replace("__", " ")}\``)
                                              .join("\n")
                                      }
                                  ]
                                : []),
                            {
                                name: "Description",
                                value:
                                    command?.detailedDescription ??
                                    command?.description ??
                                    "*No description available*"
                            },
                            {
                                name: "Syntax",
                                value: `\`\`\`\n${
                                    command?.argumentSyntaxes || subcommandMeta?.argumentSyntaxes
                                        ? (
                                              subcommandMeta?.argumentSyntaxes ??
                                              command?.argumentSyntaxes ??
                                              []
                                          )
                                              .map(s => `${config.prefix}${name} ${s}`)
                                              .join("\n")
                                        : `${config.prefix}${name}`
                                }\n\`\`\``
                            },
                            ...(command?.subcommands.length &&
                            !hasSubcommand &&
                            !command?.subcommandsMeta[subcommand]
                                ? [
                                      {
                                          name: "Subcommands",
                                          value: `Run \`${config.prefix}help ${
                                              command?.name
                                          } <subcommand>\` to see information about specific subcommands.\n\n* ${command.subcommands
                                              .map(s => `\`${s}\``)
                                              .join("\n* ")}`
                                      }
                                  ]
                                : []),
                            ...((
                                subcommandMeta?.botRequiredPermissions ??
                                command?.botRequiredPermissions
                            )?.length
                                ? [
                                      {
                                          name: "Required Bot Permissions",
                                          value:
                                              "`" +
                                              forceGetPermissionNames(
                                                  subcommandMeta?.botRequiredPermissions ??
                                                      command?.botRequiredPermissions ??
                                                      []
                                              ).join("`\n`") +
                                              "`",
                                          inline: true
                                      }
                                  ]
                                : []),
                            ...((subcommandMeta?.permissions ?? command?.permissions)?.length
                                ? [
                                      {
                                          name: "Required User Permissions",
                                          value:
                                              "`" +
                                              forceGetPermissionNames(
                                                  subcommandMeta?.permissions ??
                                                      command?.permissions ??
                                                      []
                                              ).join(
                                                  `\`\n${
                                                      command?.permissionMode === "or" ? "or, " : ""
                                                  }\``
                                              ) +
                                              "`",
                                          inline: true
                                      }
                                  ]
                                : []),
                            ...(options.length > 0
                                ? [
                                      {
                                          name: "Options",
                                          value: options
                                              .map(
                                                  ([name, description]) =>
                                                      `* \`${name}\` - ${description}`
                                              )
                                              .join("\n")
                                      }
                                  ]
                                : []),
                            {
                                name: "Mode",
                                value: `${this.emoji(
                                    subcommandMeta?.supportsLegacy ?? command?.supportsLegacy
                                        ? "check"
                                        : "error"
                                )} Legacy\n${this.emoji(
                                    subcommandMeta?.supportsInteractions ??
                                        command?.supportsInteractions
                                        ? "check"
                                        : "error"
                                )} Interaction-based`
                            },
                            {
                                name: "Other Information",
                                value: `Available since \`${
                                    subcommandMeta?.since ?? command?.since
                                }\`.\n${
                                    subcommandMeta?.beta ?? command?.beta
                                        ? "This command is under beta testing.\n"
                                        : ""
                                }${
                                    subcommandMeta?.systemAdminOnly ?? command?.systemAdminOnly
                                        ? "This command can only be used by the System Administrators of the bot.\n"
                                        : ""
                                }`,
                                inline: true
                            }
                        ]
                    }).setTimestamp()
                ]
            });
        }
    }
}
