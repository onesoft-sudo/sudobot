/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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
    ChatInputCommandInteraction,
    Colors,
    EmbedBuilder,
    Interaction,
    Message,
    PermissionsBitField,
    SlashCommandBuilder,
    codeBlock,
    escapeInlineCode,
    inlineCode
} from "discord.js";
import JSON5 from "json5";
import Client from "../../core/Client";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";
import { get, has, set, toDotted } from "../../utils/objects";

export default class ConfigCommand extends Command implements HasEventListeners {
    public readonly name = "config";
    public readonly subcommands = ["get", "set", "save", "restore"];
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "subcommand",
            optional: false,
            errors: {
                required: `You must provide a subcommand. The valid subcommands are \`${this.subcommands.join("`, `")}\`.`
            }
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageGuild];
    public readonly aliases = ["setting", "settings"];
    public readonly description = "View or change a configuration setting.";
    public readonly argumentSyntaxes = ["<key> [value]"];
    public readonly subcommandsMeta = {
        get: {
            description: "Get the value of a configuration key",
            argumentSyntaxes: ["<key>"]
        },
        set: {
            description: "Set the value of a configuration key",
            argumentSyntaxes: ["<key> <value>"]
        },
        save: {
            description: "Save the current configuration."
        },
        restore: {
            description: "Restore the previously saved configuration."
        }
    };
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("get")
                .setDescription("Get the value of a configuration key")
                .addStringOption(option =>
                    option
                        .setName("key")
                        .setDescription("The configuration key to view or change.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("config_type").setDescription("The configuration type").setChoices(
                        {
                            name: "Guild",
                            value: "guild"
                        },
                        {
                            name: "System",
                            value: "system"
                        }
                    )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription("Set the value of a configuration key")
                .addStringOption(option =>
                    option
                        .setName("key")
                        .setDescription("The configuration key to view or change.")
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("value").setDescription("The new value to set the configuration key to.").setRequired(true)
                )
                .addStringOption(option =>
                    option.setName("cast").setDescription("The type to cast the value to.").setChoices(
                        {
                            name: "String",
                            value: "string"
                        },
                        {
                            name: "Number",
                            value: "number"
                        },
                        {
                            name: "Boolean",
                            value: "boolean"
                        },
                        {
                            name: "JSON",
                            value: "json"
                        }
                    )
                )
                .addBooleanOption(option => option.setName("save").setDescription("Save the current configuration immediately."))
                .addBooleanOption(option =>
                    option.setName("no_create").setDescription("Do not create the key if it does not exist.")
                )
                .addStringOption(option =>
                    option.setName("config_type").setDescription("The configuration type").setChoices(
                        {
                            name: "Guild",
                            value: "guild"
                        },
                        {
                            name: "System",
                            value: "system"
                        }
                    )
                )
        )
        .addSubcommand(subcommand => subcommand.setName("save").setDescription("Save the current configuration."))
        .addSubcommand(subcommand => subcommand.setName("restore").setDescription("Restore the previously saved configuration."));
    protected readonly dottedConfig = {
        guild: {} as Record<string, string[]>,
        system: [] as string[]
    };

    constructor(client: Client<true>) {
        super(client);
        this.reloadDottedConfig();
    }

    reloadDottedConfig(configType: "guild" | "system" | null = null) {
        if (!configType || configType === "guild") {
            const guildConfig: Record<string, string[]> = {};

            for (const key in this.client.configManager.config) {
                guildConfig[key] = Object.keys(toDotted(this.client.configManager.config[key]!));
            }

            this.dottedConfig.guild = guildConfig;
        }

        if (!configType || configType === "system") {
            this.dottedConfig.system = Object.keys(toDotted(this.client.configManager.systemConfig));
        }
    }

    @GatewayEventListener("interactionCreate")
    async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isAutocomplete() || interaction.commandName !== this.name) {
            return;
        }

        const query = interaction.options.getFocused();
        const configType = (interaction.options.getString("config_type") ?? "guild") as "guild" | "system";
        const config = configType === "guild" ? this.dottedConfig.guild[interaction.guildId!] : this.dottedConfig.system;
        const keys = [];

        for (const key of config) {
            if (keys.length >= 25) {
                break;
            }

            if (key.includes(query)) {
                keys.push({ name: key, value: key });
            }
        }

        await interaction.respond(keys);
    }

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const subcommand = context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true);

        switch (subcommand) {
            case "get":
                return this.get(message, context);
            case "set":
                return this.set(message, context);
            case "save":
                return this.save(message);
            case "restore":
                return this.restore(message);
            default:
                await this.error(
                    message,
                    `The subcommand \`${escapeInlineCode(
                        subcommand
                    )}\` does not exist. Please use one of the following subcommands: \`${this.subcommands.join("`, `")}\`.`
                );
                return;
        }
    }

    private async get(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const key = context.isLegacy ? context.args[1] : context.options.getString("key", true);

        if (!key) {
            await this.error(message, "You must provide a configuration key to view.");
            return;
        }

        const configType = (context.isLegacy ? "guild" : context.options.getString("config_type") ?? "guild") as
            | "guild"
            | "system";
        const config = configType === "guild" ? context.config : this.client.configManager.systemConfig;

        if (!has(config, key)) {
            await this.error(message, `The configuration key \`${escapeInlineCode(key)}\` does not exist.`);
            return;
        }

        const configValue = get(config, key);
        const embed = new EmbedBuilder()
            .setTitle("Configuration Value")
            .setDescription(
                `### ${inlineCode(key)}\n\n${codeBlock(
                    "json",
                    JSON5.stringify(configValue, {
                        space: 2,
                        replacer: null,
                        quote: '"'
                    })
                )}`
            )
            .setColor(Colors.Green)
            .setTimestamp();

        await this.deferredReply(message, { embeds: [embed] });
    }

    private async set(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy) {
            if (!context.args[1]) {
                await this.error(message, "You must provide a configuration key to set.");
                return;
            }

            if (!context.args[2]) {
                await this.error(message, "You must provide a value to set the configuration key to.");
                return;
            }
        }

        const key = context.isLegacy ? context.args[1] : context.options.getString("key", true);
        const value =
            message instanceof Message && context.isLegacy
                ? message.content
                      .slice(context.prefix.length)
                      .trimStart()
                      .slice(context.argv[0].length)
                      .trimStart()
                      .slice(context.argv[1].length)
                      .trimStart()
                      .slice(context.argv[2].length)
                      .trim() // FIXME: Extract this into a method
                : (message as ChatInputCommandInteraction).options.getString("value", true);
        const cast = (context.isLegacy ? "json" : context.options.getString("cast") ?? "string") as CastType;
        const save = context.isLegacy ? false : context.options.getBoolean("save");
        const noCreate = context.isLegacy ? false : context.options.getBoolean("no_create");
        const configType = (context.isLegacy ? "guild" : context.options.getString("config_type") ?? "guild") as
            | "guild"
            | "system";
        const config = configType === "guild" ? context.config : this.client.configManager.systemConfig;

        if (!key) {
            await this.error(message, "You must provide a configuration key to set.");
            return;
        }

        if (noCreate && !has(config, key)) {
            await this.error(message, `The configuration key \`${escapeInlineCode(key)}\` does not exist.`);
            return;
        }

        let finalValue;

        switch (cast) {
            case "string":
                finalValue = value;
                break;
            case "number":
                finalValue = parseFloat(value);

                if (isNaN(finalValue)) {
                    await this.error(message, `The value \`${escapeInlineCode(value)}\` is not a valid number.`);
                    return;
                }

                break;
            case "boolean":
                {
                    const lowerCased = value.toLowerCase();

                    if (lowerCased !== "true" && lowerCased !== "false") {
                        await this.error(message, `The value \`${escapeInlineCode(value)}\` is not a valid boolean.`);
                        return;
                    }

                    finalValue = lowerCased === "true";
                }
                break;
            case "json":
                try {
                    finalValue = JSON5.parse(value);
                } catch (e) {
                    const error = codeBlock(e instanceof Object && "message" in e ? `${e.message}` : `${e}`);
                    await this.deferredReply(message, {
                        embeds: [
                            {
                                description: `### ${this.emoji("error")} Failed to parse the value as JSON\n\n${error.slice(
                                    0,
                                    1800
                                )}${error.length > 1800 ? "\n... The error message is loo long." : ""}`,
                                color: Colors.Red,
                                footer: {
                                    text: "No changes were made to the configuration"
                                },
                                timestamp: new Date().toISOString()
                            }
                        ]
                    });

                    return;
                }

                break;
        }

        set(config, key, finalValue);

        const embed = new EmbedBuilder();
        const error = this.client.configManager.testConfig();
        const errorString = error
            ? JSON5.stringify(error.error.format(), {
                  space: 2,
                  replacer: null,
                  quote: '"'
              })
            : null;

        if (errorString && error) {
            await this.client.configManager.load();

            embed
                .setDescription(
                    `### ${this.emoji("error")} The configuration is invalid (${inlineCode(
                        error.type
                    )})\n\nThe changes were not saved.\n\n${errorString.slice(0, 1800)}${
                        errorString.length > 1800 ? "\n... The error description is loo long." : ""
                    }`
                )
                .setColor(Colors.Red)
                .setFooter({ text: "The configuration was not saved." });

            await this.deferredReply(message, { embeds: [embed] });
            return;
        }

        embed
            .setTitle("Configuration Value Changed")
            .setDescription(
                `### ${inlineCode(key)}\n\n${codeBlock(
                    "json",
                    JSON5.stringify(finalValue, {
                        space: 2,
                        replacer: null,
                        quote: '"'
                    })
                )}`
            )
            .setColor(Colors.Green)
            .setTimestamp()
            .setFooter({ text: `The configuration was ${save ? "saved" : "applied"}.` });

        if (save) {
            await this.client.configManager.write({
                guild: configType === "guild",
                system: configType === "system"
            });
        }

        await this.deferredReply(message, { embeds: [embed] });
        this.reloadDottedConfig(configType);
    }

    private async save(message: CommandMessage): Promise<CommandReturn> {
        await this.client.configManager.write();
        await this.success(message, "The configuration was saved.");
    }

    private async restore(message: CommandMessage): Promise<CommandReturn> {
        await this.client.configManager.load();
        await this.success(message, "The configuration was restored.");
    }
}

type CastType = "string" | "number" | "boolean" | "json";
