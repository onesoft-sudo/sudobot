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
import { EmbedBuilder } from "discord.js";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { log, logError } from "../../utils/logger";

export default class JokeCommand extends Command {
    public readonly name = "joke";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly url = "https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist";

    public readonly description = "Tells you a random joke.";

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        try {
            const response = await axios.get(this.url, {
                headers: {
                    Accept: "application/json"
                }
            });

            log(response.data);

            await this.deferredReply(message, {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#007bff")
                        .setTitle("Joke")
                        .setDescription(
                            response.data.type === "twopart"
                                ? response.data.setup + "\n\n" + response.data.delivery
                                : response.data.joke
                        )
                        .addFields({
                            name: "Category",
                            value: response.data.category
                        })
                        .setFooter({
                            text: `ID: ${response.data.id}`
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
