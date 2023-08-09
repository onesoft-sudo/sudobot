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

import { SlashCommandBuilder, escapeMarkdown } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class AFKCommand extends Command {
    public readonly name = "afk";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.StringRest],
            name: "reason",
            optional: true,
            typeErrorMessage: "Please provide a usable/valid reason!"
        }
    ];
    public readonly permissions = [];
    public readonly description = "Sets your AFK status, and tells others that you're away.";
    public readonly slashCommandBuilder = new SlashCommandBuilder().addStringOption(option =>
        option.setName("reason").setDescription("The reason of you being AFK")
    );

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const reason = (context.isLegacy ? context.parsedNamedArgs.reason : context.options.getString("reason")) ?? undefined;

        await this.deferIfInteraction(message);
        const isAFK = this.client.afkService.isAFK(message.guildId!, message.member!.user.id);

        if (isAFK) {
            return;
        }

        await this.client.afkService.startAFK(message.guildId!, message.member!.user.id, reason);

        await this.deferredReply(message, {
            embeds: [
                {
                    color: 0x007bff,
                    description: `You're AFK now${reason ? `, for reason: **${escapeMarkdown(reason)}**` : ""}.`
                }
            ]
        });
    }
}
