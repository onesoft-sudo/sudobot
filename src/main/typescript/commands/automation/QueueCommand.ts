import type { Buildable } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import { PermissionFlagsBits } from "discord.js";

class QueueCommand extends Command {
    public override readonly name = "queue";
    public override readonly description: string = "Manage queued jobs.";
    public override readonly detailedDescription: string = "Custom command.";
    public override readonly defer = true;
    public override readonly usage = ["<subcommand: String> [...args: Any[]]"];
    public override readonly systemPermissions = [];
    public override readonly subcommands = ["list", "cancel", "show", "add"];
    public override readonly isolatedSubcommands = true;
    public override readonly aliases = ["queues", "q"];
    public override readonly permissions = [PermissionFlagsBits.ManageGuild];
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
