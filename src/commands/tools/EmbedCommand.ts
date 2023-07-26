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

import { PermissionsBitField, SlashCommandBuilder, SlashCommandSubcommandBuilder, escapeCodeBlock, escapeInlineCode } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

const addOptions = (builder: SlashCommandSubcommandBuilder) => {
    return builder
        .addStringOption(option => option.setName("author_name").setDescription("The embed author name"))
        .addStringOption(option => option.setName("author_iconurl").setDescription("The embed author icon URL"))
        .addStringOption(option => option.setName("title").setDescription("The embed title"))
        .addStringOption(option => option.setName("description").setDescription("The embed description"))
        .addStringOption(option => option.setName("thumbnail").setDescription("The embed thumbnail URL"))
        .addStringOption(option => option.setName("image").setDescription("The embed image attachment URL"))
        .addStringOption(option => option.setName("video").setDescription("The embed video attachment URL"))
        .addStringOption(option => option.setName("footer_text").setDescription("The embed footer text"))
        .addStringOption(option => option.setName("footer_iconurl").setDescription("The embed footer icon URL"))
        .addStringOption(option => option.setName("timestamp").setDescription("The embed timestamp, use 'current' to set current date"))
        .addStringOption(option => option.setName("color").setDescription("The embed color (default is #007bff)"))
        .addStringOption(option => option.setName("url").setDescription("The embed URL"))
        .addStringOption(option =>
            option.setName("fields").setDescription("The embed fields, should be in `Field 1: Value 1, Field 2: Value 2` format")
        );
};

export default class EmbedCommand extends Command {
    public readonly subcommands = ["build", "schema", "send"];
    public readonly name = "embed";

    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            name: "subcommand",
            requiredErrorMessage: `Please provide a subcommand! The available subcommands are: \`${this.subcommands.join("`, `")}\``
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            name: "schema"
        }
    ];

    public readonly permissions = [PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.ManageMessages];

    public readonly description = "Create and build custom embeds/schemas.";

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Make an embed")
        .addSubcommand(subcmd => addOptions(subcmd.setName("send").setDescription("Make and send an embed")))
        .addSubcommand(subcmd => addOptions(subcmd.setName("schema").setDescription("Make and send an embed schema representation")))
        .addSubcommand(subcmd =>
            subcmd
                .setName("build")
                .setDescription("Build an embed from schema")
                .addStringOption(option => option.setName("json_schema").setDescription("The embed JSON schema"))
        );

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const subcommand: string = context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true);

        if (!this.subcommands.includes(subcommand.toLowerCase())) {
            return {
                __reply: true,
                content: `\`${escapeInlineCode(
                    escapeCodeBlock(subcommand)
                )}\` is not a valid subcommand! The available subcommands are: \`${this.subcommands.join("`, `")}\``
            };
        }

        await this.deferIfInteraction(message);

        const command = this.client.commands.get(`embed__${subcommand}`);

        if (command) {
            if (!command.supportsLegacy && context.isLegacy) {
                await this.error(message, `This command doesn't support legacy commands, please try the slash command.`);
                return;
            }

            await command.execute(message, context);
        }
    }
}
