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
import type Context from "@framework/commands/Context";
import { env } from "@main/env/env";
import { getAxiosClient } from "@main/utils/axios";
import { EmbedBuilder } from "discord.js";

class JokeCommand extends Command {
    public override readonly name = "joke";
    public override readonly description: string = "Fetch a random joke.";
    public override readonly usage = [""];
    public override readonly aliases = ["dadjoke"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption(option =>
                option
                    .setName("type")
                    .setDescription("The type of joke to fetch.")
                    .setRequired(false)
                    .setChoices(
                        {
                            name: "Default",
                            value: "joke"
                        },
                        {
                            name: "Dad Joke",
                            value: "dad_joke"
                        }
                    )
            )
        ];
    }

    public override async execute(context: Context): Promise<void> {
        const isDadJoke =
            context.commandName === "dadjoke" ||
            (context.isChatInput() && context.options.getString("type") === "dad_joke");

        if (isDadJoke && !env.API_NINJAS_JOKE_API_KEY) {
            await context.error("Dad jokes are disabled because the API key is not set.");
            return;
        }

        const url: string = isDadJoke
            ? "https://api.api-ninjas.com/v1/dadjokes"
            : "https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist";

        try {
            const response = await getAxiosClient().get(url, {
                headers: isDadJoke
                    ? {
                          Accept: "application/json",
                          "X-Api-Key": process.env.API_NINJAS_JOKE_API_KEY
                      }
                    : undefined
            });

            const embed = new EmbedBuilder()
                .setColor("#007bff")
                .setTitle("Joke")
                .setDescription(
                    !isDadJoke
                        ? response.data.type === "twopart"
                            ? response.data.setup + "\n\n" + response.data.delivery
                            : response.data.joke
                        : response.data[0].joke
                )
                .addFields(
                    ...(!isDadJoke
                        ? [
                              {
                                  name: "Category",
                                  value: response.data.category
                              }
                          ]
                        : [])
                )
                .setFooter({
                    text: !isDadJoke
                        ? `ID: ${response.data.id}`
                        : `Type: ${isDadJoke ? "Dad Joke" : "Regular"}`
                });

            await context.reply({ embeds: [embed] });
        } catch (error) {
            this.application.logger.error(error);
            await context.error("Failed to fetch joke: Invalid API response");
            return;
        }
    }
}

export default JokeCommand;
