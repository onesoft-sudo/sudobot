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

import type { ParserState } from "@framework/directives/Directive";
import Directive from "@framework/directives/Directive";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import type DirectiveParser from "@framework/directives/DirectiveParser";
import { escapeRegex } from "@framework/utils/utils";
import type { APIEmbed } from "discord.js";
import { z } from "zod";

class EmbedDirective extends Directive<APIEmbed> {
    public override readonly name = "embed";
    public static readonly discordApiEmbedSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        fields: z
            .array(
                z.object({
                    name: z.string(),
                    value: z.string()
                })
            )
            .optional(),
        footer: z
            .object({
                text: z.string()
            })
            .optional(),
        color: z.number().optional(),
        author: z
            .object({
                name: z.string(),
                icon_url: z.string().optional(),
                url: z.string().optional()
            })
            .optional(),
        image: z
            .object({
                url: z.string()
            })
            .optional(),
        thumbnail: z
            .object({
                url: z.string()
            })
            .optional(),
        timestamp: z.string().optional(),
        url: z.string().optional(),
        video: z
            .object({
                url: z.string()
            })
            .optional(),
        provider: z
            .object({
                name: z.string()
            })
            .optional()
    });

    public override apply(parser: DirectiveParser, state: ParserState, arg: APIEmbed) {
        const embed = EmbedDirective.discordApiEmbedSchema.safeParse(arg);

        if (!embed.success) {
            throw new DirectiveParseError(
                "Invalid argument: must be a valid Discord API Embed object",
                {
                    cause: embed.error
                }
            );
        }

        if (!state.output.endsWith("\n")) {
            state.output += "\n";
        }

        if (state.currentArgument) {
            state.output = state.output.replace(
                new RegExp(`@embed(\\s*)\\((\\s*)${escapeRegex(state.currentArgument)}(\\s*)\\)`),
                ""
            );
        }

        state.data.embeds ??= [];
        (state.data.embeds as Array<APIEmbed>).push(embed.data);
    }
}

export default EmbedDirective;
