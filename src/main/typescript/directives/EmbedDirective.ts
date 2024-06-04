import type { ParserState } from "@framework/directives/Directive";
import Directive from "@framework/directives/Directive";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import type DirectiveParser from "@framework/directives/DirectiveParser";
import type { APIEmbed } from "discord.js";
import { z } from "zod";
import { escapeRegex } from "@framework/utils/utils";

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

    public override async apply(parser: DirectiveParser, state: ParserState, arg: APIEmbed) {
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
            state.output = state.output.replace(new RegExp(`@embed(\\s*)\\((\\s*)${escapeRegex(state.currentArgument)}(\\s*)\\)`), "");
        }

        state.data.embeds ??= [];
        (state.data.embeds as Array<APIEmbed>)!.push(embed.data);
    }
}

export default EmbedDirective;
