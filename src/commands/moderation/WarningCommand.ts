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

import { PermissionsBitField } from "discord.js";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class WarningCommand extends Command {
    public readonly name = "warning";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.ManageMessages];
    public readonly aliases = ["warnings", "warns"];
    public readonly supportsInteractions: boolean = false;

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        return {
            __reply: true,
            content:
                "**This command was removed in version 5.0 of SudoBot.**\n\nPlease use `-infraction delete <warning_id>` to delete warnings. Also, you can delete any infraction (mute, ban, kick) using this command."
        };
    }
}
