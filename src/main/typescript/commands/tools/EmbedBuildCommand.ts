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
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import RestStringArgument from "@framework/arguments/RestStringArgument";
import { Command } from "@framework/commands/Command";
import type InteractionContext from "@framework/commands/InteractionContext";
import type LegacyContext from "@framework/commands/LegacyContext";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import { type ChatInputCommandInteraction, EmbedBuilder, type GuildBasedChannel } from "discord.js";
import JSON5 from "json5";
import { z } from "zod";

const EmbedZodSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    color: z.number().optional(),
    fields: z.array(
        z.object({
            name: z.string(),
            value: z.string(),
            inline: z.boolean().default(false)
        })
    ),
    footer: z
        .object({
            text: z.string()
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
    author: z
        .object({
            name: z.string(),
            icon_url: z.string().optional()
        })
        .optional(),
    timestamp: z.string().optional(),
    url: z.string().optional(),
    video: z
        .object({
            url: z.string()
        })
        .optional()
});

type EmbedBuildCommandArgs = {
    schema: string;
};

@ArgumentSchema.Definition({
    names: ["schema"],
    types: [RestStringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "Please provide an embed schema."
        }
    ]
})
class EmbedBuildCommand extends Command {
    public override readonly name: string = "embed::build";
    public override readonly description: string = "Generate an embed from a schema.";
    public override readonly usage = ["<schema: String>"];
    public override readonly permissions = [
        PermissionFlags.ManageGuild,
        PermissionFlags.ManageMessages
    ];
    public override readonly permissionCheckingMode = "or";

    public override async execute(
        context: LegacyContext | InteractionContext<ChatInputCommandInteraction>,
        args: EmbedBuildCommandArgs
    ) {
        await context.defer({
            ephemeral: true
        });

        let embed: EmbedBuilder;

        try {
            const parsed = await EmbedZodSchema.parseAsync(JSON5.parse(args.schema));
            embed = new EmbedBuilder(parsed);
        } catch (error) {
            this.application.logger.debug(error);

            if (error instanceof z.ZodError) {
                await context.error(
                    `Invalid embed schema: ${error.errors.map(e => e.message).join(", ")}`
                );
            } else {
                await context.error("Invalid schema provided.");
            }

            return;
        }

        const channel = context.isChatInput()
            ? ((context.options.getChannel("channel") as GuildBasedChannel) ?? context.channel)
            : context.channel;

        if (!channel?.isTextBased()) {
            await context.error("This command can only be used in text channels.");
            return;
        }

        await channel.send({
            embeds: [embed]
        });

        if (context.isChatInput()) {
            await context.reply({ content: "Message sent." });
        }
    }
}

export default EmbedBuildCommand;
