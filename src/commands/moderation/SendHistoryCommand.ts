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

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import Command, { ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class SendHistoryCommand extends Command {
    public readonly name = "sendhistory";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            entity: true,
            errors: {
                required: "You must specify a user to give shot!",
                "type:invalid": "You have specified an invalid user mention or ID.",
                "entity:null": "The given user does not exist!"
            },
            name: "user"
        }
    ];
    public readonly permissions = [PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageGuild];
    public readonly permissionMode = "or";

    public readonly aliases = ["modlogs", "genlogs", "genhistory"];
    public readonly description = "Generates a file that contains the infraction history of the given user.";

    public readonly slashCommandBuilder = new SlashCommandBuilder().addUserOption(option =>
        option.setName("user").setDescription("The target user").setRequired(true)
    );

    async execute(message: CommandMessage): Promise<CommandReturn> {
        await this.deferIfInteraction(message, { ephemeral: true });

        const { buffer, count } = await this.client.infractionManager.createInfractionHistoryBuffer(
            message.member!.user,
            message.guild!
        );

        if (!buffer) {
            await this.deferredReply(message, "This user doesn't have any infractions.");
            return;
        }

        await this.deferredReply(message, {
            content: `${this.emoji(
                "check"
            )} Successfully generated the infraction history. The attached files contains ${count} records.`,
            files: [
                {
                    attachment: buffer,
                    name: `history-${message.member!.user.username}.txt`
                }
            ]
        });
    }
}
