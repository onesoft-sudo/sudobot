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
import Command, { CommandReturn, ValidationRule } from "../../core/Command";
import { ChatInputCommandContext } from "../../services/CommandManager";
import { generateEmbed } from "../../utils/embed";

export default class EmbedSendCommand extends Command {
    public readonly name = "embed__send";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.ManageMessages
    ];
    public readonly supportsLegacy = false;

    async execute(
        interaction: ChatInputCommandInteraction,
        context: ChatInputCommandContext
    ): Promise<CommandReturn> {
        const { embed, error } = generateEmbed(context.options);

        if (error) {
            await this.error(interaction, error);
            return;
        }

        try {
            await interaction.channel?.send({
                embeds: [embed!]
            });

            await interaction.editReply({ content: "Message sent." });
        } catch (e) {
            interaction.editReply({ content: "Invalid options given." });
        }
    }
}
