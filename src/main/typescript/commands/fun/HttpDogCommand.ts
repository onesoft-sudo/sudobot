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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import IntegerArgument from "@framework/arguments/IntegerArgument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import axios from "axios";

type HttpDogCommandArgs = {
    code: number;
};

@ArgumentSchema.Definition({
    names: ["code"],
    types: [IntegerArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.InvalidType]: "The status argument must be a valid HTTP status code.",
            [ErrorType.Required]: "The status argument is required.",
            [ErrorType.InvalidRange]: "The status argument must be a valid HTTP status code."
        }
    ],
    rules: [
        {
            "range:max": 599,
            "range:min": 100
        }
    ]
})
class HttpDogCommand extends Command {
    public override readonly name: string = "httpdog";
    public override readonly description: string = "Get a dog image for a given HTTP status code.";
    public override readonly defer = true;
    public override readonly usage = ["<code>"];

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addIntegerOption(option =>
                option
                    .setName("code")
                    .setDescription("The HTTP status code.")
                    .setMinValue(100)
                    .setMaxValue(599)
                    .setRequired(true)
            )
        ];
    }

    public override async execute(context: Context, args: HttpDogCommandArgs): Promise<void> {
        const { code } = args;
        const url = `https://http.dog/${code}.jpg`;

        try {
            await axios.get(url);
        } catch {
            await context.error("No dog found for that status code.");
            return;
        }

        await context.reply({
            files: [url]
        });
    }
}

export default HttpDogCommand;
