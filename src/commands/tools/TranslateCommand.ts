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
    ApplicationCommandOptionChoiceData,
    ApplicationCommandType,
    CacheType,
    ContextMenuCommandBuilder,
    EmbedBuilder,
    Interaction,
    MessageContextMenuCommandInteraction,
    SlashCommandBuilder,
    User
} from "discord.js";
import { readFileSync } from "fs";
import JSON5 from "json5";
import path from "path";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { ChatInputCommandContext } from "../../services/CommandManager";
import { HasEventListeners } from "../../types/HasEventListeners";

export default class TranslateCommand extends Command implements HasEventListeners {
    public readonly name = "translate";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.StringRest],
            errors: {
                required: "Please specify the text to translate!",
                "type:invalid": "Invalid input given"
            },
            name: "text"
        }
    ];
    public readonly permissions = [];
    public readonly aliases = ["Translate to English"];
    public readonly languages: Record<string, string> = JSON5.parse(
        readFileSync(path.resolve(__dirname, "../../../resources/languages.json"), { encoding: "utf-8" })
    );

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option => option.setName("text").setDescription("The text to translate").setRequired(true))
        .addStringOption(option => option.setName("from").setDescription("The language of the input text").setAutocomplete(true))
        .addStringOption(option => option.setName("to").setDescription("The language of the output text").setAutocomplete(true));

    public readonly otherApplicationCommandBuilders = [
        new ContextMenuCommandBuilder()
            .setName("Translate to English")
            .setType(ApplicationCommandType.Message)
            .setDMPermission(false)
    ];

    public readonly description = "Translates the given text.";

    protected readonly displayNames = new Intl.DisplayNames(["en"], {
        type: "language"
    });

    protected readonly supportedLocales = Intl.DisplayNames.supportedLocalesOf();

    @GatewayEventListener("interactionCreate")
    onInteractionCreate(interaction: Interaction<CacheType>) {
        if (!interaction.isAutocomplete()) {
            return;
        }

        const focused = interaction.options.getFocused();
        const matches: ApplicationCommandOptionChoiceData[] = [];

        for (const code in this.languages) {
            if (matches.length >= 25) {
                break;
            }

            if (code === focused || this.languages[code].includes(focused)) {
                matches.push({
                    name: this.languages[code],
                    value: code
                });
            }
        }

        if (matches.length < 25) {
            for (const locale of this.supportedLocales) {
                if (matches.length >= 25) {
                    break;
                }

                if (this.languages[locale]) {
                    continue;
                }

                const displayName = this.displayNames.of(locale);

                if (!displayName) {
                    continue;
                }

                if (locale === focused || displayName.includes(focused)) {
                    matches.push({
                        name: displayName,
                        value: locale
                    });
                }
            }
        }

        console.log(matches);
        interaction.respond(matches).catch(console.error);
    }

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const text = context.isLegacy
            ? context.parsedNamedArgs.text
            : message instanceof MessageContextMenuCommandInteraction && context.isContextMenu
            ? message.targetMessage.content
            : (context as ChatInputCommandContext).options.getString("text", true);

        if (!text) {
            await this.error(message, "Invalid text content provided.");
            return;
        }

        const from = context.isLegacy ? "auto" : (context.isContextMenu ? "auto" : context.options.getString("from")) ?? "auto";
        const to = context.isLegacy ? "en" : (context.isContextMenu ? "en" : context.options.getString("to")) ?? "en";

        const toString = this.displayNames.of(to);

        if (from !== "auto" && !this.languages[from] && !this.displayNames.of(from)) {
            await this.error(message, "Invalid language specified in the `from` option");
            return;
        }

        if (to !== "auto" && !this.languages[to] && !this.displayNames.of(to)) {
            await this.error(message, "Invalid language specified in the `to` option");
            return;
        }

        const { error, translation, response } = await this.client.translator.translate(text, from, to);

        if (error) {
            await this.deferredReply(message, {
                embeds: [
                    new EmbedBuilder({
                        color: 0xf14a60,
                        author: {
                            name: "Translation Failed"
                        },
                        description: `${this.emoji("error")} Couldn't translate that due to an internal error.`,
                        footer: {
                            text: "Powered by Google Translate"
                        }
                    }).setTimestamp()
                ]
            });

            return;
        }

        const fromString = this.displayNames.of(response!.data.src);

        await this.deferredReply(message, {
            embeds: [
                new EmbedBuilder({
                    color: 0x007bff,
                    author: {
                        name:
                            message instanceof MessageContextMenuCommandInteraction
                                ? (message.targetMessage.author as User).username
                                : "Translation",
                        iconURL:
                            message instanceof MessageContextMenuCommandInteraction
                                ? (message.targetMessage.author as User).displayAvatarURL()
                                : undefined
                    },
                    description: translation,
                    footer: {
                        text: `Translated from ${fromString ?? this.languages[response!.data.src] ?? response!.data.src} to ${
                            toString ?? this.languages[to] ?? to
                        } • Powered by Google Translate`
                    }
                })
            ]
        });
    }
}
