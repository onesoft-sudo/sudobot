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

import { User } from "discord.js";
import { TakesArgument } from "../../framework/arguments/ArgumentTypes";
import RestStringArgument from "../../framework/arguments/RestStringArgument";
import UserArgument from "../../framework/arguments/UserArgument";
import { Command, CommandMessage } from "../../framework/commands/Command";
import Context from "../../framework/commands/Context";
import SystemAdminPermission from "../../permissions/SystemAdminPermission";
import { ErrorMessages } from "../../utils/ErrorMessages";

type BeanCommandArgs = {
    user: User;
    reason?: string;
};

@TakesArgument<BeanCommandArgs>("user", UserArgument<true>, false, UserArgument.defaultErrors)
@TakesArgument<BeanCommandArgs>("reason", RestStringArgument, true, ErrorMessages.reason)
class BeanCommand extends Command {
    public override readonly name = "bean";
    public override readonly description = "Beans a user.";
    public override readonly detailedDescription =
        "Sends a DM to the user telling them they've been beaned. It doesn't actually do anything.";
    public override readonly permissions = [SystemAdminPermission];

    public override async execute(
        context: Context<CommandMessage>,
        args: BeanCommandArgs
    ): Promise<void> {
        console.log(args);
        const { user, reason } = args;
        await user.send(`You've been beaned!${reason ? ` Reason: ${reason}` : ""}`);
        await context.reply("Beaned!");
    }
}

export default BeanCommand;
