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
import { PermissionsBitField, User } from "discord.js";
import Command, { AnyCommandContext, ArgumentType, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class InfractionListCommand extends Command {
    public readonly name = "infraction__list";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.User],
            name: "user",
            requiredErrorMessage: `Please provide a user to clear their infractions!`,
            typeErrorMessage: `Please provide a __valid__ user!`,
            entityNotNull: true,
            entityNotNullErrorMessage: "This user does not exist!"
        }
    ];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly aliases: string[] = ["ci"];

    public readonly description = "Clear infractions of a user.";
    public readonly argumentSyntaxes = ["<UserID|UserMention>"];

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        await this.deferIfInteraction(message);

        const user: User = context.isLegacy ? context.parsedNamedArgs.user : context.options.getUser("user", true);
        const type = context.isLegacy ? undefined : context.options.getString("type")?.toUpperCase();

        if (type && !(type in InfractionType)) {
            await this.error(message, "Invalid infraction type provided");
            return;
        }

        const { count } = await this.client.prisma.infraction.deleteMany({
            where: {
                userId: user.id,
                guildId: message.guildId!,
                type: type
                    ? {
                          in: [type as InfractionType]
                      }
                    : undefined
            }
        });

        if (count === 0) {
            await this.deferredReply(message, "No infractions found for this user!");
            return;
        }

        await this.deferredReply(message, `${this.emoji("check")} Deleted ${count} infractions for user ${user.username}`);
    }
}
