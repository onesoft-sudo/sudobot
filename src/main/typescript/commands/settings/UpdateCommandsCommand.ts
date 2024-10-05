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

import type { Buildable, ChatContext } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import { Inject } from "@framework/container/Inject";
import { isDiscordAPIError } from "@framework/utils/errors";
import CommandManager from "@main/services/CommandManager";

class UpdateCommandsCommand extends Command {
    public override readonly name: string = "uc";
    public override readonly description: string = "Update the application commands.";
    public override readonly aliases = ["update-commands", "ucmds", "upcmds"];
    public override readonly systemAdminOnly = true;
    public override readonly options: Record<string, string> = {
        "-c, --clear": "Clear all commands before updating.",
        "-l, --local": "Update only the local commands."
    };
    public override readonly since = "10.5.0";

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addBooleanOption(option =>
                    option
                        .setName("clear")
                        .setDescription("Clear all commands instead of updating.")
                )
                .addBooleanOption(option =>
                    option.setName("local").setDescription("Update only the local commands.")
                )
        ];
    }

    @Inject()
    private readonly commandManager!: CommandManager;

    public override async execute(context: ChatContext): Promise<void> {
        const local = context.isChatInput()
            ? (context.options.getBoolean("local") ?? false)
            : context.args.includes("--local") || context.args.includes("-l");

        const clear = context.isChatInput()
            ? (context.options.getBoolean("clear") ?? false)
            : context.args.includes("--clear") || context.args.includes("-c");

        try {
            const count = await this.commandManager.updateApplicationCommands({
                clear,
                global: !local
            });

            await context.success(
                `Successfully ${clear ? "unregistered" : "updated"} **${clear ? "all" : count}** ${local ? "local " : ""}application commands.`
            );
        } catch (error) {
            this.application.logger.error(error);

            if (isDiscordAPIError(error)) {
                await context.error(`Failed to update the application commands: ${error.message}`);
                return;
            }

            await context.error("Failed to update the application commands");
        }
    }
}

export default UpdateCommandsCommand;
