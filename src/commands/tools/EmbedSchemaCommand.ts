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

import { ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import JSON5 from "json5";
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { ChatInputCommandContext } from "../../services/CommandManager";
import { generateEmbed } from "../../utils/embed";

export default class EmbedSchemaCommand extends Command {
    public readonly name = "embed__schema";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.ManageMessages];
    public readonly supportsLegacy = false;

    async execute(interaction: ChatInputCommandInteraction, context: ChatInputCommandContext): Promise<CommandReturn> {
        const { embed, error } = generateEmbed(context.options);

        if (error) {
            await this.error(interaction, error);
            return;
        }

        const json = JSON5.stringify(embed, null, 4);

        return {
            __reply: true,
            content: `Successfully generated embed schema:\n\n\`\`\`\n${json}\n\`\`\`\nYou can now reuse this schema as many times as you want to send embeds.`
        };
    }
}
