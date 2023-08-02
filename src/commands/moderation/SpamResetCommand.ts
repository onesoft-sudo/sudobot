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
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class SpamResetCommand extends Command {
    public readonly name = "spamreset";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            requiredErrorMessage: "Please provide a user to perform this action!",
            entityNotNull: true,
            entityNotNullErrorMessage: "Invalid user given or the user does not exist!",
            typeErrorMessage: "Please provide a valid user ID/mention!",
            name: "user"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly aliases = ["sreset"];
    public readonly description = "Reset spam records for a user.";

    public readonly slashCommandBuilder = new SlashCommandBuilder().addUserOption(option =>
        option.setName("user").setDescription("The target user").setRequired(true)
    );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);

        const { count } = await this.client.prisma.spamRecord.deleteMany({
            where: {
                guild_id: message.guildId!,
                user_id: user.id
            }
        });

        if (count === 0) {
            await this.error(message, `No spam record exists for user **${escapeMarkdown(user.username)}**.`);
            return;
        }

        await this.success(message, `Cleared **${count}** records for user **${escapeMarkdown(user.username)}**.`);
    }
}
