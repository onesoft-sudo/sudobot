import type { ParserState } from "@framework/directives/Directive";
import Directive from "@framework/directives/Directive";
import DirectiveParseError from "@framework/directives/DirectiveParseError";
import type DirectiveParser from "@framework/directives/DirectiveParser";
import type { APIEmbed } from "discord.js";
import JSON5 from "json5";
import { z } from "zod";

class EmbedDirective extends Directive {
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

    public override async apply(parser: DirectiveParser, state: ParserState, arg: string) {
        let parsed;

        try {
            parsed = JSON5.parse(arg);
        } catch (error) {
            throw new DirectiveParseError("Invalid argument: must be valid JSON5", {
                cause: error
            });
        }

        const embed = EmbedDirective.discordApiEmbedSchema.safeParse(parsed);

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

        state.output = state.output.replace(/@embed\s*\([^\n]+\)\n/gi, "");
        state.data.embeds ??= [];
        (state.data.embeds as Array<APIEmbed>)!.push(embed.data);
    }
}

export default EmbedDirective;
