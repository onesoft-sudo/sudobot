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

import { InfractionType } from "@prisma/client";
import { Message, PermissionsBitField, User } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { safeUserFetch } from "../../utils/fetch";
import { createModerationEmbed, isSnowflake } from "../../utils/utils";

export default class NoteCreateCommand extends Command {
    public readonly name = "note";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            optional: false,
            errors: {
                required: "Please specify a user to take note for!",
                "entity:null": "Invalid user specified!",
                "type:invalid": "Invalid user specified!"
            }
        },
        {
            types: [ArgumentType.StringRest],
            name: "content",
            optional: true,
            errors: {
                required: "Please specify the note contents!"
            }
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "Take a note about a user.";
    public readonly argumentSyntaxes = ["<user> <reason>"];
    public readonly aliases = ["notecreate", "createnote"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user: User = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);
        const reason: string | null = context.isLegacy ? context.parsedNamedArgs.reason : context.options.getString("reason");

        const { id } = await this.client.prisma.infraction.create({
            data: {
                guildId: message.guildId!,
                moderatorId: message.member!.user.id,
                userId: user.id,
                type: InfractionType.NOTE,
                reason: reason ?? null
            }
        });

        await this.deferredReply(message, {
            embeds: [
                await createModerationEmbed({
                    user,
                    moderator: message.member!.user as User,
                    id,
                    reason: reason ?? undefined,
                    actionDoneName: "noted"
                })
            ]
        });
    }
}
