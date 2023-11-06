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
import { SlashCommandBuilder } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";

export default class MixEmojiCommand extends Command {
    public readonly name = "mixemoji";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "first",
            requiredErrorMessage: "Please specify 2 emojis to mix!",
            typeErrorMessage: "Please specify 2 valid emojis to mix!"
        },
        {
            types: [ArgumentType.String],
            name: "second",
            requiredErrorMessage: "Please specify 2 emojis to mix!",
            typeErrorMessage: "Please specify 2 valid emojis to mix!"
        }
    ];
    public readonly permissions = [];
    public readonly aliases = ["ce", "combineemoji", "mix", "emojimix"];
    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addStringOption(option => option.setName("first").setDescription("The first emoji").setRequired(true))
        .addStringOption(option => option.setName("second").setDescription("The second emoji").setRequired(true));
    protected readonly API_URL = "https://emojiapi.onesoftnet.eu.org/emojis/combine";
    public readonly description = "Mixes two emojis and shows you the result, if any. Uses Google's Emoji Kitchen.";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const first = (context.isLegacy ? context.parsedNamedArgs.first : context.options.getString("first", true)).trim();
        const second = (context.isLegacy ? context.parsedNamedArgs.second : context.options.getString("second", true)).trim();

        if (!/^\p{Extended_Pictographic}$/gu.test(first)) {
            await this.error(
                message,
                "Invalid emoji given as the first argument. Make sure it's not a server emoji, and put a space in between the 2 emojis."
            );
            return;
        }

        if (!/^\p{Extended_Pictographic}$/gu.test(second)) {
            await this.error(
                message,
                "Invalid emoji given as the second argument. Make sure it's not a server emoji, and put a space in between the 2 emojis."
            );
            return;
        }

        await this.deferIfInteraction(message);

        try {
            const response = await axios.post(
                this.API_URL,
                {
                    emoji1: first,
                    emoji2: second
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.OSN_EMOJIKITCHEN_API}`
                    }
                }
            );

            const combination = response.data.combination;

            await this.deferredReply(message, {
                embeds: [
                    {
                        title: "Emoji Mix",
                        url: combination.gStaticUrl,
                        description: `Mixed ${first} and ${second}`,
                        image: {
                            url: combination.gStaticUrl,
                            height: 50,
                            width: 50
                        },
                        color: 0x007bff,
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        } catch (error) {
            logError(error);

            if ((error as any)?.response?.status === 404) {
                await this.error(message, "No combination found for the given emojis.");
                return;
            }

            await this.error(message, "An internal API error has occurred. Please try again later.");
        }
    }
}
