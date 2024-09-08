import Application from "@framework/app/Application";
import { ArgumentSchema } from "@framework/arguments/ArgumentTypes";
import StringArgument from "@framework/arguments/StringArgument";
import { Command } from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import { ContextType, contextTypeToString } from "@framework/commands/ContextType";
import { Inject } from "@framework/container/Inject";
import Pagination from "@framework/pagination/Pagination";
import { Permission } from "@framework/permissions/Permission";
import { permissionBigintToString } from "@framework/permissions/PermissionFlag";
import { Colors } from "@main/constants/Colors";
import CommandManager from "@main/services/CommandManager";
import { emoji } from "@main/utils/emoji";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    escapeInlineCode,
    inlineCode
} from "discord.js";

type HelpCommandArgs = {
    command?: string;
    subcommand?: string;
};

@ArgumentSchema.Definition({
    names: ["command"],
    types: [StringArgument],
    optional: true
})
@ArgumentSchema.Definition({
    names: ["subcommand"],
    types: [StringArgument],
    optional: true
})
class HelpCommand extends Command {
    public override readonly name: string = "help";
    public override readonly description: string = "Shows help information about the commands.";
    public override readonly usage = ["[command: String]"];

    private static readonly responseComponents = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Docs")
                .setURL("https://docs.sudobot.onesoftnet.eu.org")
                .setEmoji("📘"),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Website")
                .setURL("https://sudobot.onesoftnet.eu.org")
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
                .setEmoji(emoji(Application.current(), "github")?.toString() || "🐙")
        )
    ];

    private static readonly minimalResponseComponents = [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Docs")
                .setURL("https://docs.sudobot.onesoftnet.eu.org")
                .setEmoji("📘"),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("Website")
                .setURL("https://sudobot.onesoftnet.eu.org")
                .setEmoji("🌐"),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel("GitHub")
                .setURL("https://github.com/onesoft-sudo/sudobot")
                .setEmoji(emoji(Application.current(), "github")?.toString() || "🐙")
        )
    ];

    @Inject()
    private readonly commandManager!: CommandManager;

    public override build() {
        return [
            this.buildChatInput()
                .addStringOption(option =>
                    option
                        .setName("command")
                        .setDescription("The command to show help information for.")
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName("subcommand")
                        .setDescription("The subcommand to show help information for.")
                        .setRequired(false)
                )
        ];
    }

    public override async execute(context: Context, args: HelpCommandArgs) {
        const { command, subcommand } = args;

        if (command) {
            const isSubcommand = !!subcommand;
            const commandExpression = `${command}` + (isSubcommand ? ` ${subcommand}` : "");
            const rootCommand = this.commandManager.getCommand(command);

            if (!rootCommand) {
                return void (await context.error(
                    `Command \`${escapeInlineCode(command)}\` not found.`
                ));
            }

            const resolvedCommand = this.commandManager.getCommand(
                subcommand ? `${command}::${subcommand}` : command
            );

            if (!resolvedCommand) {
                return void (await context.error(
                    `Command \`${escapeInlineCode(commandExpression)}\` not found.`
                ));
            }

            const baseName = resolvedCommand.name.split("::")[0];
            const prefix = context.config?.prefix ?? "-";
            const commandHead = `${prefix}${baseName}` + (isSubcommand ? ` ${subcommand}` : "");
            const metadata =
                rootCommand.isolatedSubcommands && subcommand
                    ? (rootCommand.subcommandMeta[subcommand] ?? {})
                    : resolvedCommand;
            let description = `## ${commandHead}\n`;

            description += `### Group\n${inlineCode(rootCommand.group)}\n`;
            description += `### Aliases\n${
                !metadata.aliases?.length
                    ? "*None*\n"
                    : metadata.aliases
                          .filter(a => !a.includes(" ") && !a.includes("::"))
                          .map(alias => `${inlineCode(alias)}`)
                          .join(", ")
            }\n`;
            description += `### Description\n${metadata.detailedDescription ?? metadata.description}\n`;
            description += `### Usage\n${metadata.usage?.length ? metadata.usage.map(usage => `${inlineCode(commandHead + " " + usage)}`).join("\n") : inlineCode(commandHead)}\n`;

            if (!subcommand && resolvedCommand.subcommands?.length) {
                description += "### Subcommands\n";

                for (const subcommand of resolvedCommand.subcommands) {
                    description += `${inlineCode(subcommand)}, `;
                }

                description =
                    description.slice(0, -2) +
                    `\nRun \`${prefix}help ${resolvedCommand.name} <subcommand>\` for more information.\n`;
            }

            const options = metadata.options ? Object.entries(metadata.options) : null;

            if (options?.length) {
                description += "### Options\n";

                for (const [option, details] of options) {
                    description += `* ${inlineCode(option)} - ${details}\n`;
                }
            }

            const finalPermissions = [
                ...(metadata.permissions ?? []),
                ...(metadata.persistentDiscordPermissions ?? []),
                ...(metadata.persistentCustomPermissions ?? [])
            ];

            if (finalPermissions.length) {
                const commandPermissionSuffix = `, ${metadata.permissionCheckingMode === "or" ? "__or__ " : ""}`;
                description += "### Permissions\n";

                for (const permission of finalPermissions) {
                    description += `${inlineCode(typeof permission === "string" ? permission : ((await Permission.resolve(permission))?.toString() ?? "Unknown"))}${commandPermissionSuffix}`;
                }

                description = description.slice(0, -commandPermissionSuffix.length) + "\n";
            }

            if (metadata.systemPermissions) {
                description += "### Required System Permissions\n";

                for (const permission of metadata.systemPermissions) {
                    description += `${inlineCode(typeof permission === "string" ? permission : typeof permission === "bigint" ? (permissionBigintToString(permission) ?? "Unknown") : ((await Permission.resolve(permission))?.toString() ?? "Unknown"))}, `;
                }

                description =
                    description.slice(0, -2) +
                    "\n\n:warning: The bot requires these permissions to execute the command.\n";
            }

            description += "### Supported Contexts\n";

            if (
                !(metadata.supportedContexts ?? rootCommand.supportedContexts).includes(
                    ContextType.Legacy
                )
            ) {
                description +=
                    `${context.emoji("error")} ${contextTypeToString(ContextType.Legacy)}\n`.trimStart();
            }

            for (const contextType of metadata.supportedContexts ?? rootCommand.supportedContexts) {
                description +=
                    `${context.emoji("check")} ${contextTypeToString(contextType)}\n`.trimStart();
            }

            let otherInformation = "";

            if (rootCommand.disabled) {
                otherInformation += "🔒 **Disabled**\n";
            }

            if (metadata.beta) {
                otherInformation += `${context.emoji("beta")} **Beta**\n`.trimStart();
            }

            if (metadata.deprecated) {
                otherInformation += "⚠️ **Deprecated**\n";
            }

            if (metadata.since) {
                otherInformation += `✨ Since **v${metadata.since}**\n`;
            }

            if (metadata.systemAdminOnly) {
                otherInformation +=
                    `${context.emoji("sysadmin")} **System Staff Only**\n`.trimStart();
            }

            if (otherInformation) {
                description += `### Misc\n${otherInformation}\n`;
            }

            await context.reply({
                embeds: [
                    {
                        description,
                        color: Colors.Primary,
                        thumbnail: {
                            url: this.application.client.user!.displayAvatarURL()
                        },
                        timestamp: new Date().toISOString()
                    }
                ],
                components: HelpCommand.minimalResponseComponents
            });

            return;
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

        const pagination = Pagination.withData(
            Object.entries(commands).sort((a, b) => a[0].localeCompare(b[0]))
        )
            .setLimit(1)
            .setActionRowBuilder(row => [...HelpCommand.responseComponents, row])
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
                    ]
                };
            });

        const message = await context.reply(await pagination.getMessageOptions());
        pagination.setInitialMessage(message);
    }
}

export default HelpCommand;
