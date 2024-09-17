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

import ShellCommand from "@main/shell/core/ShellCommand";
import { ShellCommandContext } from "@main/shell/core/ShellCommandContext";

class SudoShellCommand extends ShellCommand {
    public override readonly name: string = "sudo";

    public override usage(context: ShellCommandContext) {
        context.println("Usage: sudo <command>");
    }

    public override async execute(context: ShellCommandContext): Promise<void> {
        if (!context.args[0]) {
            context.exit(1);
        }

        const service = this.application.service("shellService");
        await service.executeCommand(
            context.args.join(" "),
            context.ws,
            new ShellCommandContext(context.ws, context.args, true)
        );
    }
}

export default SudoShellCommand;
