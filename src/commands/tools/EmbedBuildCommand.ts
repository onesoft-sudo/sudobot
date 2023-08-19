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

import { EmbedBuilder, Message, PermissionsBitField } from "discord.js";
import JSON5 from "json5";
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { logError } from "../../utils/logger";

export default class EmbedBuildCommand extends Command {
    public readonly name = "embed__build";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.ManageMessages];

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        if (context.isLegacy && !context.parsedNamedArgs.schema) {
            await this.error(message, "Please provide an embed schema!");
            return;
        }

        const schema = context.isLegacy ? context.parsedNamedArgs.schema : context.options.getString("schema", true);
        let json: EmbedBuilder | undefined = undefined;

        try {
            json = JSON5.parse(schema);
        } catch (e) {
            logError(e);
            await this.error(message, "Invalid JSON schema provided!");
            return;
        }

        try {
            await message.channel?.send({
                embeds: [json!]
            });

            if (message instanceof Message) await message.react(this.emoji("check")).catch(logError);
            else
                return {
                    __reply: true,
                    content: "Successfully built and sent embed",
                    ephemeral: true
                };
        } catch (e) {
            await this.error(message, "Failed to send embed. Maybe I don't have enough permissions?");
            return;
        }
    }
}
