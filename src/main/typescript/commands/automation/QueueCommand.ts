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

import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";

class QueueCommand extends Command {
    public override readonly name = "queue";
    public override readonly description: string = "Manage queued jobs.";
    public override readonly detailedDescription: string = "Custom command.";
    public override readonly defer = true;
    public override readonly usage = ["<subcommand: String> [...args: Any[]]"];
    public override readonly systemPermissions = [];
    public override readonly subcommands = [
        "list",
        "cancel",
        "show",
        "view",
        "add",
        "remove",
        "delete"
    ];
    public override readonly isolatedSubcommands = true;
    public override readonly aliases = ["queues", "q"];
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly subcommandMeta = {
        list: {
            description: "List all queued jobs."
        },
        cancel: {
            description: "Cancel a queued job.",
            usage: ["<jobId: String>"]
        },
        show: {
            description: "Show a queued job.",
            usage: ["<jobId: String>"]
        },
        add: {
            description: "Add a command execution job to the queue.",
            usage: ["<runAfter: Duration> <...command: RestString[]>"]
        }
    };

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand.setName("list").setDescription("List all queued jobs.")
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("cancel")
                        .setDescription("Cancel a queued job.")
                        .addStringOption(option =>
                            option
                                .setName("id")
                                .setDescription("The ID of the job to cancel.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("show")
                        .setDescription("Show a queued job.")
                        .addStringOption(option =>
                            option
                                .setName("id")
                                .setDescription("The ID of the job to show.")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Add a command execution job to the queue.")
                        .addStringOption(option =>
                            option
                                .setName("run_after")
                                .setDescription("The duration to wait before running the command.")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("command")
                                .setDescription("The command to run.")
                                .setRequired(true)
                        )
                )
        ];
    }

    public override async execute(): Promise<void> {}
}

export default QueueCommand;
