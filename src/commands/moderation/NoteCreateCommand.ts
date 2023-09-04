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
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { isSnowflake } from "../../utils/utils";

export default class NoteCreateCommand extends Command {
    public readonly name = "note__create";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "Create a note";
    public readonly argumentSyntaxes = ["<user> <content>"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            await this.error(message, "Please specify a user to take note for!");
            return;
        }

        if (context.isLegacy && context.args[1] === undefined) {
            await this.error(message, "Please specify the note contents!");
            return;
        }

        let user: User | null | undefined = context.isLegacy ? undefined : context.options.getUser("user", true);

        if (context.isLegacy) {
            user = await this.client.fetchUserSafe(
                isSnowflake(context.args[0])
                    ? context.args[0]
                    : context.args[0].substring(context.args[0].includes("!") ? 3 : 2, context.args[0].length - 1)
            );
        }

        if (!user) {
            await this.error(message, "Invalid user specified!");
            return;
        }

        const content = context.isLegacy
            ? (message as Message).content
                  .substring(this.client.configManager.config[message.guildId!]?.prefix?.length ?? 1)
                  .trimStart()
                  .substring("note".length)
                  .trimStart()
                  .substring(this.name.replace("note__", "").length)
                  .trimStart()
                  .substring(context.args[0].length)
                  .trimEnd()
            : context.options.getString("content", true);

        const { id } = await this.client.prisma.infraction.create({
            data: {
                guildId: message.guildId!,
                moderatorId: message.member!.user.id,
                userId: user.id,
                type: InfractionType.NOTE,
                reason: content
            }
        });

        await this.deferredReply(
            message,
            `${this.emoji("check")} Successfully created note for user **${user.tag}**. The note ID is \`${id}\`.`
        );
    }
}
