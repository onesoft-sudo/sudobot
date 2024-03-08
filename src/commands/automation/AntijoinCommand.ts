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
import Command, { CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class AntijoinCommand extends Command {
    public readonly name = "antijoin";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [PermissionsBitField.Flags.KickMembers];
    public readonly aliases = ["raidmode"];

    public readonly description = "Turn anti join mode on or off";

    async execute(message: CommandMessage): Promise<CommandReturn> {
        const enabled = this.client.antijoin.toggle(message.guild!);

        return {
            __reply: true,
            content:
                `${this.emoji("check")} Turned ${enabled ? "on" : "off"} anti-join system.` +
                (enabled ? " New users will automatically be kicked." : "")
        };
    }
}
