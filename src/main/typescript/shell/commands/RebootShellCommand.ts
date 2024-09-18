/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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
import type { ShellCommandContext } from "@main/shell/core/ShellCommandContext";

class RebootShellCommand extends ShellCommand {
    public override readonly name: string = "reboot";
    public override readonly aliases: string[] = ["restart"];

    public override execute(context: ShellCommandContext): void {
        if (!context.elevatedPrivileges) {
            context.println("reboot: Operation not permitted", "stderr");
            context.println(
                "reboot: You may need elevated privileges to perform this action.",
                "stderr"
            );
            context.exit(1);
        }

        context.println("Rebooting in 5 seconds. You will lose connection to the shell.");
        setTimeout(() => this.application.service("startupManager").requestRestart(), 5000);
    }
}

export default RebootShellCommand;
