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

import { PermissionsBitField, SlashCommandBuilder, User, escapeMarkdown } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { protectSystemAdminsFromCommands } from "../../utils/troll";
import { createModerationEmbed } from "../../utils/utils";

export default class ShotCommand extends Command {
    public readonly name = "shot";
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
        },
        {
            types: [ArgumentType.StringRest],
            optional: true,
            errors: {
                "type:invalid": "You have specified an invalid shot reason.",
                "string:rest:length:max": "The shot reason must be less than 4000 characters long."
            },
            string: {
                maxLength: 3999
            },
            name: "reason"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly permissionMode = "or";

    public readonly description = "Gives shot to a user.";
    public readonly detailedDescription =
        "This command doesn't do anything special except DMing the user and telling them that they've been given a shot.";

    public readonly slashCommandBuilder = new SlashCommandBuilder()
        .addUserOption(option => option.setName("user").setDescription("The target user").setRequired(true))
        .addStringOption(option => option.setName("reason").setDescription("Reason for giving shot to this user"));

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);

        if (await protectSystemAdminsFromCommands(this.client, message, user.id, "shot_safe")) {
            return;
        }

        const {
            commands: { moderation_command_behaviour }
        } = context.config;
        const deleteResponse = moderation_command_behaviour === "delete";
        const reason = context.isLegacy ? context.parsedNamedArgs.reason : context.options.getString("reason");

        const { id, reason: finalReason } = await this.client.infractionManager.createUserShot(user, {
            reason,
            guild: message.guild!,
            moderator: message.member!.user as User
        });

        await this.deferredReply(
            message,
            {
                embeds: [
                    await createModerationEmbed({
                        moderator: message.member!.user as User,
                        user,
                        id,
                        color: 0x007bff,
                        reason: finalReason,
                        description: `**${escapeMarkdown(user.username)}** has been given a shot.`,
                        fields: [
                            {
                                name: "💉 Doctor",
                                value: `${message.member!.user.username}`
                            }
                        ]
                    })
                ]
            },
            deleteResponse ? "delete" : "default"
        );
    }
}
