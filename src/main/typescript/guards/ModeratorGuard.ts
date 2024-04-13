/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
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

import { AnyCommand } from "@framework/commands/Command";
import { AnyContext } from "@framework/commands/Context";
import { Guard } from "@framework/guards/Guard";

class ModeratorGuard extends Guard {
    public override async check(command: AnyCommand, context: AnyContext): Promise<boolean> {
        return command.beta && context.userId === "1234567890";
    }
}

export default ModeratorGuard;
