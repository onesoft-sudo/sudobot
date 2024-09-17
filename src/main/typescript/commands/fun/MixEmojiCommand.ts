/*
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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { getAxiosClient } from "@main/utils/axios";
import { AxiosError } from "axios";

type MixEmojiCommandArgs = {
    first: string;
    second: string;
};

@ArgumentSchema.Definition({
    names: ["first"],
    types: [StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "You need to provide the first emoji."
        }
    ]
})
@ArgumentSchema.Definition({
    names: ["second"],
    types: [StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "You need to provide the second emoji."
        }
    ]
})
class MixEmojiCommand extends Command {
    public override readonly name = "mixemoji";
    public override readonly description: string = "Mix two emojis together.";
    public override readonly detailedDescription: string =
        "Mix two emojis, powered by EmojiKitchen.";
    public override readonly defer = true;
    public override readonly usage = ["<first: Emoji> <second: Emoji>"];
    public override readonly aliases = ["emojimix"];
    public static readonly API_URL = "https://emojiapi.onesoftnet.eu.org/emojis/combine";

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("first")
                        .setDescription("The first emoji to mix.")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("second")
                        .setDescription("The second emoji to mix.")
                        .setRequired(true)
                )
        ];
    }

    public override async execute(
        context: Context,
        { first, second }: MixEmojiCommandArgs
    ): Promise<void> {
        if (!/^\p{Extended_Pictographic}$/gu.test(first)) {
            await context.error(
                "Invalid emoji given as the first argument. Make sure it's not a server emoji, and put a space in between the 2 emojis."
            );
            return;
        }

        if (!/^\p{Extended_Pictographic}$/gu.test(second)) {
            await context.error(
                "Invalid emoji given as the second argument. Make sure it's not a server emoji, and put a space in between the 2 emojis."
            );
            return;
        }

        try {
            const response = await getAxiosClient().post(
                MixEmojiCommand.API_URL,
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

            await context.reply({
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
            this.application.logger.error(error);

            if ((error as AxiosError)?.response?.status === 404) {
                await context.error("No combination found for the given emojis.");
                return;
            }

            await context.error("An internal API error has occurred. Please try again later.");
        }
    }
}

export default MixEmojiCommand;
