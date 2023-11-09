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

import axios, { AxiosRequestConfig } from "axios";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { GuildConfig } from "../../types/GuildConfigSchema";
import { log, logError } from "../../utils/logger";

type JokeType = GuildConfig["commands"]["default_joke_type"];

export default class JokeCommand extends Command {
    public readonly name = "joke";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly urls: Record<JokeType, () => [Exclude<JokeType, "random">, string, AxiosRequestConfig]> = {
        joke: () => [
            "joke",
            "https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist",
            {
                headers: {
                    Accept: "application/json"
                }
            }
        ],
        dadjoke: () => [
            "dadjoke",
            "https://api.api-ninjas.com/v1/dadjokes?limit=1",
            {
                headers: {
                    Accept: "application/json",
                    "X-Api-Key": process.env.API_NINJAS_JOKE_API_KEY
                }
            }
        ],
        random: () => {
            const values = Object.values(this.urls);
            return values[Math.floor(Math.random() * values.length)]!();
        }
    };

    public readonly description = "Tells you a random joke.";

    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option
            .setName("type")
            .setDescription("The type of the joke")
            .setChoices<Array<{ name: string; value: JokeType }>>(
                {
                    name: "Random (Default)",
                    value: "random"
                },
                {
                    name: "Regular Joke",
                    value: "joke"
                },
                ...(process.env.API_NINJAS_JOKE_API_KEY
                    ? ([
                          {
                              name: "Dad Joke",
                              value: "dadjoke"
                          }
                      ] as const)
                    : [])
            )
    );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const type = <JokeType>(
            ((context.isLegacy ? null : context.options.getString("type")) ??
                this.client.configManager.config[message.guildId!]?.commands?.default_joke_type)
        );

        await this.deferIfInteraction(message);

        const [finalType, url, options] = this.urls[type]();

        try {
            const response = await axios.get(url, options);

            log(response.data);

            await this.deferredReply(message, {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#007bff")
                        .setTitle("Joke")
                        .setDescription(
                            finalType === "joke"
                                ? response.data.type === "twopart"
                                    ? response.data.setup + "\n\n" + response.data.delivery
                                    : response.data.joke
                                : response.data[0].joke
                        )
                        .addFields(
                            ...(finalType === "joke"
                                ? [
                                      {
                                          name: "Category",
                                          value: response.data.category
                                      }
                                  ]
                                : [])
                        )
                        .setFooter({
                            text:
                                finalType === "joke"
                                    ? `ID: ${response.data.id}`
                                    : `Type: ${type[0].toUpperCase() + type.substring(1)}`
                        })
                ]
            });
        } catch (e) {
            logError(e);

            await this.deferredReply(message, {
                content: "Something went wrong with the API response. Please try again later."
            });
        }
    }
}
