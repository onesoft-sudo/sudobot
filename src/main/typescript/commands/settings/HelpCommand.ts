import { Command } from "@framework/commands/Command";
import { TakesArgument } from "@framework/arguments/ArgumentTypes";
import StringArgument from "@framework/arguments/StringArgument";
import { TODO } from "@framework/utils/devflow";
import Pagination from "@framework/pagination/Pagination";
import CommandManager from "@main/services/CommandManager";
import { Inject } from "@framework/container/Inject";
import { Colors } from "@main/constants/Colors";
import type Context from "@framework/commands/Context";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, inlineCode } from "discord.js";
import { emoji } from "@framework/utils/emoji";
import Application from "@framework/app/Application";

type HelpCommandArgs = {
    command?: string;
};

@TakesArgument<HelpCommand>({
    names: ["command"],
    types: [StringArgument],
    optional: true
})
class HelpCommand extends Command {
    public override readonly name: string = "help";
    public override readonly description: string = "Shows help information about the commands.";
    public override readonly usage = ["[command: String]"];

    private static readonly responseComponents = [
        new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Docs")
                    .setURL("https://docs.sudobot.org")
                    .setEmoji("📘"),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Website")
                    .setURL("https://www.sudobot.org")
                    .setEmoji("🌐"),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Support")
                    .setURL("https://discord.gg/892GWhTzgs")
                    .setEmoji("🛠️"),
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("GitHub")
                    .setURL("https://github.com/onesoft-sudo/sudobot")
                    .setEmoji(emoji(Application.current().client, "github")?.toString() ?? "🐙"),
            )
    ];

    @Inject()
    private readonly commandManager!: CommandManager;

    public override async execute(context: Context, args: HelpCommandArgs) {
        const { command } = args;

        if (command) {
            TODO("Show help for a specific command.");
        }

        const commands: Record<string, Command[]> = {};

        for (const [key, command] of this.commandManager.commands) {
            if (command.name !== key || command.name.includes("::") || command.name.includes(" ")) {
                continue;
            }

            if (!commands[command.group]) {
                commands[command.group] = [];
            }

            commands[command.group].push(command);
        }

        const pagination = Pagination
            .withData(Object.entries(commands))
            .setLimit(1)
            .setActionRowBuilder((row) => [...HelpCommand.responseComponents, row])
            .setMaxTimeout(Pagination.DEFAULT_TIMEOUT)
            .setMessageOptionsBuilder(({ data: [[group, commands]], maxPages, page }) => {
                let description = `## ${context.emoji("sudobot")} Help\n**\`[...]\` means optional argument, \`<...>\` means required argument.**\n`;

                description += `### ${group}\n`;

                for (const command of commands) {
                    description += `${inlineCode(command.name)}, `;
                }

                description = description.slice(0, -2);

                return {
                    embeds: [
                        {
                            description,
                            color: Colors.Primary,
                            footer: {
                                text: `Page ${page} of ${maxPages}`
                            },
                            timestamp: new Date().toISOString()
                        }
                    ],
                };
            });

        const message = await context.reply(await pagination.getMessageOptions());
        pagination.setInitialMessage(message);
    }
}

export default HelpCommand;