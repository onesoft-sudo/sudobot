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

import { PermissionsBitField, SlashCommandBuilder, escapeMarkdown } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class RemoveAFKCommand extends Command {
    public readonly name = "removeafk";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            requiredErrorMessage: "Please specify a user to perform this action!",
            entityNotNull: true,
            entityNotNullErrorMessage: "That user does not exist!"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageMessages];
    public readonly permissionMode = "or";
    public readonly aliases = ["rmafk", "delafk", "deleteafk", "clearafk"];

    public readonly description = "Removes the AFK status of the given user.";
    public readonly argumentSyntaxes = ["<user>"];
    public readonly slashCommandBuilder = new SlashCommandBuilder().addUserOption(option =>
        option.setName("user").setDescription("The target user").setRequired(true)
    );

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const user = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);

        if (!this.client.afkService.isAFK(message.guildId!, user.id)) {
            await this.error(message, "This user does not have an AFK status set.");
            return;
        }

        await this.deferIfInteraction(message);
        const info = await this.client.afkService.removeAFK(message.guildId!, user.id);

        if (!info) {
            await this.error(message, "This user does not have an AFK status set.");
            return;
        }

        await this.success(message, `**${escapeMarkdown(user.username)}**'s AFK status was removed.`);
    }
}
