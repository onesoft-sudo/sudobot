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

import { PermissionsBitField, SlashCommandBuilder } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class BlockedFileCommand extends Command {
    public readonly name = "blockedfile";
    public readonly aliases = ["blockedfiles"];
    public readonly permissions = [PermissionsBitField.Flags.ManageGuild];
    public readonly subcommands = ["add", "remove", "view"];
    public readonly description = "Manage blocked files";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            errors: {
                required: `Please provide a subcommand! The valid commands are: \`${this.subcommands.join("`, `")}\``,
                "type:invalid": "Please provide a valid subcommand!"
            },
            name: "subcommand"
        }
    ];

    public readonly slashCommandBuilder = new SlashCommandBuilder().addSubcommand(subcommand =>
        subcommand
            .setName("add")
            .setDescription("Adds a file hash to the blocklist")
            .addAttachmentOption(option => option.setName("file").setDescription("The target file to block").setRequired(true))
    );
    // TODO
    // .addSubcommand(subcommand =>
    //     subcommand
    //         .setName("view")
    //         .setDescription("Shows a poll/ballot")
    //         .addIntegerOption(option => option.setName("id").setDescription("The ballot ID").setRequired(true))
    // )
    // .addSubcommand(subcommand =>
    //     subcommand
    //         .setName("delete")
    //         .setDescription("Deletes a poll/ballot")
    //         .addIntegerOption(option => option.setName("id").setDescription("The ballot ID").setRequired(true))
    // );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const subcommand = context.isLegacy ? context.parsedNamedArgs.subcommand : context.options.getSubcommand(true);
        const command = this.client.commands.get(`blockedfile__${subcommand}`);

        if (!command) {
            return;
        }

        if (context.isLegacy) context.args.shift();

        return await command.execute(message, context);
    }
}
