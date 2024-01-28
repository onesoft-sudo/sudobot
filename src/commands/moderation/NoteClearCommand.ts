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
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { safeUserFetch } from "../../utils/fetch";
import { isSnowflake } from "../../utils/utils";

export default class NoteClearCommand extends Command {
    public readonly name = "note__clear";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "Clear all the notes of a user";
    public readonly argumentSyntaxes = ["<UserID|UserMention>"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            await this.error(message, "Please specify a user to clear notes!");
            return;
        }

        let user: User | null | undefined = context.isLegacy ? undefined : context.options.getUser("user", true);

        if (context.isLegacy) {
            user = await safeUserFetch(
                this.client,
                isSnowflake(context.args[0])
                    ? context.args[0]
                    : context.args[0].substring(context.args[0].includes("!") ? 3 : 2, context.args[0].length - 1)
            );
        }

        if (!user) {
            await this.error(message, "Invalid user specified!");
            return;
        }

        const { count } = await this.client.prisma.infraction.deleteMany({
            where: {
                userId: user.id,
                guildId: message.guildId!,
                type: InfractionType.NOTE
            }
        });

        if (count === 0) {
            await this.deferredReply(message, "No notes were found for this user.");
            return;
        }

        await this.deferredReply(message, `${this.emoji("check")} Deleted ${count} notes of user **${user.username}**`);
    }
}
