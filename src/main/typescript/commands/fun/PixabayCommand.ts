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
import RestStringArgument from "@framework/arguments/RestStringArgument";
import StringArgument from "@framework/arguments/StringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { env } from "@main/env/env";
import { getAxiosClient } from "@main/utils/axios";
import { AxiosError } from "axios";

type PixabayCommandArgs = {
    type: "image" | "photo" | "vector" | "illustration";
    query: string;
};

@ArgumentSchema.Definition({
    names: ["type"],
    types: [StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "Please provide a type."
        }
    ],
    interactionName: "query"
})
@ArgumentSchema.Definition({
    names: ["query"],
    types: [RestStringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "Please provide a query to search!"
        }
    ]
})
class PixabayCommand extends Command {
    public override readonly name = "pixabay";
    public override readonly description: string = "Fetch a random image from pixabay.";
    public override readonly defer = true;
    public override readonly usage = [""];
    public override readonly systemPermissions = [];

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("image")
                        .setDescription("Search for any kind of image.")
                        .addStringOption(option =>
                            option
                                .setName("query")
                                .setDescription("The query to search for.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("photo")
                        .setDescription("Search for pictures.")
                        .addStringOption(option =>
                            option
                                .setName("query")
                                .setDescription("The query to search for.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("vector")
                        .setDescription("Search for vectors.")
                        .addStringOption(option =>
                            option
                                .setName("query")
                                .setDescription("The query to search for.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("illustration")
                        .setDescription("Search for illustrations.")
                        .addStringOption(option =>
                            option
                                .setName("query")
                                .setDescription("The query to search for.")
                                .setRequired(true)
                        )
                )
        ];
    }

    public override async execute(
        context: Context,
        { query, type }: PixabayCommandArgs
    ): Promise<void> {
        type = context.isChatInput() ? (context.options.getSubcommand(true) as typeof type) : type;

        if (!["image", "photo", "vector", "illustration"].includes(type)) {
            await context.error(
                "Invalid type. Please provide one of the following: image, photo, vector, illustration."
            );
            return;
        }

        if (!env.PIXABAY_TOKEN) {
            await context.error("The pixabay token is not set in the environment variables.");
            return;
        }

        try {
            const response = await getAxiosClient().get(
                `https://pixabay.com/api/?key=${env.PIXABAY_TOKEN}&safesearch=true&per_page=3`,
                {
                    params: {
                        q: query,
                        image_type: type
                    }
                }
            );

            if (!response.data.hits || response.data.hits?.length < 1) {
                await context.error("No search result found from the API.");
                return;
            }

            await context.reply({
                content:
                    response.data.hits[Math.floor(Math.random() * response.data.hits.length)]
                        .largeImageURL
            });
        } catch (error) {
            this.application.logger.error(error);

            if (error instanceof AxiosError && error.status === 429) {
                await context.error(
                    "You have exceeded the rate limit for this command. Please try again later."
                );
                return;
            }

            await context.error("An error occurred while fetching the image.");
        }
    }
}

export default PixabayCommand;
