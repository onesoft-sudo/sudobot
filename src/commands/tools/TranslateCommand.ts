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

import { ApplicationCommandOptionChoiceData, CacheType, Interaction } from "discord.js";
import { readFileSync } from "fs";
import path from "path";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";

export default class TranslateCommand extends Command implements HasEventListeners {
    public readonly name = "translate";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.StringRest],
            requiredErrorMessage: "Please specify the text to translate!",
            typeErrorMessage: "Invalid input given",
            name: "text"
        }
    ];
    public readonly permissions = [];
    public readonly languages: Record<string, string> = JSON.parse(
        readFileSync(path.resolve(__dirname, "../../../resources/languages.json"), { encoding: "utf-8" })
    );

    @GatewayEventListener("interactionCreate")
    onInteractionCreate(interaction: Interaction<CacheType>) {
        if (!interaction.isAutocomplete()) {
            return;
        }

        const focused = interaction.options.getFocused();
        const matches: ApplicationCommandOptionChoiceData[] = [];

        for (const code in this.languages) {
            if (matches.length >= 24) {
                break;
            }

            if (code === focused || this.languages[code].includes(focused)) {
                matches.push({
                    name: this.languages[code],
                    value: code
                });
            }
        }

        console.log(matches);
        interaction.respond(matches).catch(console.error);
    }

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const text = context.isLegacy ? context.parsedNamedArgs.text : context.options.getString("text", true);
        const from = context.isLegacy ? "auto" : context.options.getString("from") ?? "auto";
        const to = context.isLegacy ? "en" : context.options.getString("to") ?? "en";

        if (from !== "auto" && !this.languages[from]) {
            await this.error(message, "Invalid language specified in the `from` option");
            return;
        }

        if (to !== "auto" && !this.languages[to]) {
            await this.error(message, "Invalid language specified in the `to` option");
            return;
        }
    }
}
