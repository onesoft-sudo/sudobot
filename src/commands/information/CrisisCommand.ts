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

import axios from "axios";
import { AutocompleteInteraction, SlashCommandBuilder } from "discord.js";
import { readFile } from "fs/promises";
import path from "path";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GatewayEventListener } from "../../decorators/GatewayEventListener";
import { HasEventListeners } from "../../types/HasEventListeners";
import { logError } from "../../utils/logger";

export default class CrisisCommand extends Command implements HasEventListeners {
    public readonly name = "crisis";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            typeErrorMessage: "Invalid country code/name provided!",
            requiredErrorMessage: "Please provide a country code or name!",
            name: "country"
        }
    ];
    public readonly permissions = [];

    public readonly description = "Show the emergency numbers for different countries.";
    public readonly beta = true;
    public readonly argumentSyntaxes = ["<country_code>"];
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("country").setDescription("The country").setRequired(true).setAutocomplete(true)
    );

    protected countryInfo: Record<string, string> = {};
    protected readonly url = "https://emergencynumberapi.com/api/country";

    @GatewayEventListener("ready")
    async onReady() {
        this.countryInfo = JSON.parse(await readFile(path.resolve(__dirname, "../../../resources/countries.json"), { encoding: "utf-8" }));
    }

    async onAutoCompleteInteraction(interaction: AutocompleteInteraction) {
        const query = interaction.options.getFocused(true).value.toLowerCase();
        const results = [];

        for (const countryCode in this.countryInfo) {
            if (results.length >= 25) break;

            if (countryCode.toLowerCase().includes(query) || this.countryInfo[countryCode].toLowerCase().includes(query)) {
                results.push({
                    name: this.countryInfo[countryCode],
                    value: countryCode
                });
            }
        }

        await interaction.respond(results);
    }

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const country: string = (context.isLegacy ? context.parsedNamedArgs.country : context.options.getString("country", true)).toUpperCase();
        const countryName = this.countryInfo[country];

        if (!countryName) {
            await this.error(message, "Invalid country code provided. Please use slash commands to get auto completion.");
            return;
        }

        await this.deferIfInteraction(message);

        try {
            const response = await axios.get(`${this.url}/${encodeURIComponent(country)}`);

            if (response.data.error) {
                await this.error(message, response.data.error);
                return;
            }

            const { data } = response.data;
            let description = "";

            if (data.ambulence && (data.ambulence.all?.[0] || data.ambulence.gsm || data.ambulence.fixed)) {
                description += `Ambulence: ${data.ambulence.all?.[0] ?? data.ambulence.gsm ?? data.ambulence.fixed}\n`;
            }

            if (data.fire && (data.fire.all?.[0] || data.fire.gsm || data.fire.fixed)) {
                description += `Fire Brigade: ${data.fire.all?.[0] ?? data.fire.gsm ?? data.fire.fixed}\n`;
            }

            if (data.police && (data.police.all?.[0] || data.police.gsm || data.police.fixed)) {
                description += `Police: ${data.police.all?.[0] ?? data.police.gsm ?? data.police.fixed}\n`;
            }

            if (data.dispatch && (data.dispatch.all?.[0] || data.dispatch.gsm || data.dispatch.fixed)) {
                description += `Dispatch: ${data.dispatch.all?.[0] ?? data.dispatch.gsm ?? data.dispatch.fixed}\n`;
            }

            await this.deferredReply(message, {
                embeds: [
                    {
                        title: `Showing emergency numbers of ${countryName}`,
                        description,
                        color: 0x007bff
                    }
                ]
            });
        } catch (e) {
            logError(e);
            await this.error(message, "The API did not return a valid status code. This is a possible error in the API or you got ratelimited.");
        }
    }
}
