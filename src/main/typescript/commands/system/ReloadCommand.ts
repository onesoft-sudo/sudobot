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
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import StringArgument from "@framework/arguments/StringArgument";
import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { Inject } from "@framework/container/Inject";
import CommandManager from "@main/services/CommandManager";

type ReloadCommandArgs = {
    command: string;
};

@ArgumentSchema.Definition({
    names: ["command"],
    types: [StringArgument],
    optional: false,
    errorMessages: [
        {
            [ErrorType.Required]: "You must provide a command to reload."
        }
    ]
})
class ReloadCommand extends Command {
    public override readonly name = "reload";
    public override readonly description: string = "Reload a command.";
    public override readonly defer = true;
    public override readonly aliases = ["rl"];
    public override readonly usage = ["<command: String>"];
    public override readonly systemAdminOnly = true;

    @Inject()
    private readonly commandManager!: CommandManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption(option =>
                option.setName("command").setDescription("The command to reload").setRequired(true)
            )
        ];
    }

    public override async execute(
        context: Context,
        { command: name }: ReloadCommandArgs
    ): Promise<void> {
        const command = this.commandManager.getCommand(name);

        if (!command) {
            await context.error(`Command \`${name}\` not found.`);
            return;
        }

        if (!command.file) {
            await context.error(`Command \`${name}\` is not reloadable.`);
            return;
        }

        try {
            await this.commandManager.reloadCommand(command);
        } catch (error) {
            await context.error(`Failed to reload command \`${name}\`.`);
            return;
        }

        await context.success(`Command \`${name}\` reloaded.`);
    }
}

export default ReloadCommand;
