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
import { Message, PermissionsBitField } from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class UserNoteEditCommand extends Command {
    public readonly name = "unote__edit";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ViewAuditLog];
    public readonly permissionMode = "or";
    public readonly description = "Edit a note";
    public readonly argumentSyntaxes = ["<id> <new_content>"];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && context.args[0] === undefined) {
            await this.error(message, "Please specify the ID of the note to delete!");
            return;
        }

        let id = context.isLegacy ? undefined : context.options.getInteger("id", true);

        if (context.isLegacy) {
            id = parseInt(context.args[0]);

            if (isNaN(id)) {
                await this.error(message, "Invalid note ID given - note IDs must be valid numbers!");
                return;
            }
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

        const { count } = await this.client.prisma.infraction.updateMany({
            where: {
                id,
                guildId: message.guildId!,
                type: InfractionType.NOTE
            },
            data: {
                reason: content
            }
        });

        if (count === 0) {
            await this.error(message, "No such note found with that ID!");
            return;
        }

        await this.deferredReply(message, `${this.emoji("check")} Note updated successfully.`);
    }
}
