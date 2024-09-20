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

import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import UserArgument from "@framework/arguments/UserArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import ConfigurationManager from "@main/services/ConfigurationManager";
import { User } from "discord.js";

type SystemUnbanCommandArgs = {
    user: User;
};

@ArgumentSchema.Definition({
    names: ["user"],
    types: [UserArgument<true>],
    optional: false,
    errorMessages: [UserArgument.defaultErrors]
})
class SystemUnbanCommand extends Command {
    public override readonly name = "sysunban";
    public override readonly description: string = "Unban a user from the system.";
    public override readonly defer = true;
    public override readonly aliases = ["systemunban"];
    public override readonly usage = ["<user: User>"];
    public override readonly systemAdminOnly = true;

    @Inject()
    private readonly configManager!: ConfigurationManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addUserOption(option =>
                option.setName("user").setDescription("The user to unban").setRequired(true)
            )
        ];
    }

    public override async execute(
        context: Context,
        { user }: SystemUnbanCommandArgs
    ): Promise<void> {
        const index = this.configManager.systemConfig.commands.system_banned_users.indexOf(user.id);

        if (index === -1) {
            await context.error(`User **${user.username}** is not banned!`);
            return;
        }

        this.configManager.systemConfig.commands.system_banned_users.splice(index, 1);
        await this.configManager.write({ guild: false, system: true });
        await context.success(`User **${user.username}** has been unbanned from the system.`);
    }
}

export default SystemUnbanCommand;
