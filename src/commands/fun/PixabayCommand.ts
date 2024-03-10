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
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Command, {
    ArgumentType,
    BasicCommandContext,
    CommandMessage,
    CommandReturn,
    ValidationRule
} from "../../core/Command";

function url() {
    return `https://pixabay.com/api/?key=${process.env.PIXABAY_TOKEN}&safesearch=true&per_page=3`;
}

export async function image(
    cmd: Command & { hitError: PixabayCommand["hitError"] },
    message: CommandMessage,
    options: BasicCommandContext,
    type: "photo" | "all" | "illustration" | "vector"
) {
    let genurl = `${url()}&image_type=${type}`;
    const query = !options.isLegacy
        ? options.options.getString("query")
        : options.parsedNamedArgs.query;

    if (query && query.trim() !== "") {
        const q = new URLSearchParams({ q: query }).toString();
        genurl += `&${q}`;
    }

    axios
        .get(genurl)
        .then(async res => {
            if (res && res.status === 200) {
                if (!res.data.hits || res.data.hits?.length < 1) {
                    await cmd.hitError(message, "No search result found from the API.");

                    return;
                }

                await cmd.deferredReply(message, {
                    content:
                        res.data.hits[Math.floor(Math.random() * res.data.hits.length)]
                            .largeImageURL
                });
            }
        })
        .catch(async () => {
            await cmd.deferredReply(message, {
                embeds: [
                    new EmbedBuilder()
                        .setColor("#f14a60")
                        .setDescription(
                            "Too many requests at the same time, please try again after some time."
                        )
                ]
            });
        });
}

export async function photo(
    cmd: Command & { hitError: PixabayCommand["hitError"] },
    message: CommandMessage,
    options: BasicCommandContext
) {
    await image(cmd, message, options, "photo");
}

export async function vector(
    cmd: Command & { hitError: PixabayCommand["hitError"] },
    message: CommandMessage,
    options: BasicCommandContext
) {
    await image(cmd, message, options, "vector");
}

export async function illustration(
    cmd: Command & { hitError: PixabayCommand["hitError"] },
    message: CommandMessage,
    options: BasicCommandContext
) {
    await image(cmd, message, options, "illustration");
}

export default class PixabayCommand extends Command {
    public readonly name = "pixabay";
    public readonly subcommandsCustom = ["image", "photo", "illustration", "vector"];
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "subcommand",
            errors: {
                required: `Please provide a valid subcommand! The available subcommands are: \`${this.subcommandsCustom.join(
                    "`, `"
                )}\`.`
            }
        },
        {
            types: [ArgumentType.StringRest],
            name: "query",
            optional: true,
            errors: {
                "type:invalid": "Invalid query given"
            }
        }
    ];
    public readonly permissions = [];
    public readonly description = "Fetch images from Pixabay";

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addSubcommand(subcommand =>
            subcommand
                .setName("image")
                .setDescription("Fetch any type of image")
                .addStringOption(option =>
                    option.setName("query").setDescription("The search query")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("photo")
                .setDescription("Fetch captured photos only")
                .addStringOption(option =>
                    option.setName("query").setDescription("The search query")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("vector")
                .setDescription("Fetch vector graphics only")
                .addStringOption(option =>
                    option.setName("query").setDescription("The search query")
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("illustration")
                .setDescription("Fetch illustrations")
                .addStringOption(option =>
                    option.setName("query").setDescription("The search query")
                )
        );

    public hitError(message: CommandMessage, errorMessage: string) {
        return this.error(message, errorMessage);
    }

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const subcmd = context.isLegacy
            ? context.parsedNamedArgs.subcommand
            : context.options.getSubcommand(true);

        if (subcmd === "photo") {
            await photo(this, message, context);
        } else if (subcmd === "vector") {
            await vector(this, message, context);
        } else if (subcmd === "illustration") {
            await illustration(this, message, context);
        } else if (subcmd === "image") {
            await image(this, message, context, "all");
        }
    }
}
