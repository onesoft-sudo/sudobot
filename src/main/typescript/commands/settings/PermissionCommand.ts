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

import type { Buildable, ChatContext, SubcommandMeta } from "@framework/commands/Command";
import { Command } from "@framework/commands/Command";
import { Inject } from "@framework/container/Inject";
import Pagination from "@framework/pagination/Pagination";
import { PermissionFlags } from "@framework/permissions/PermissionFlag";
import {
    CommandPermissionOverwrite,
    CommandPermissionOverwriteAction,
    commandPermissionOverwrites
} from "@main/models/CommandPermissionOverwrite";
import CommandManager from "@main/services/CommandManager";
import { escapeMarkdown, InteractionReplyOptions, MessageReplyOptions } from "discord.js";
import { and, arrayContains, count, eq } from "drizzle-orm";

class PermissionCommand extends Command {
    public override readonly name = "permission";
    public override readonly description = "Manage command permissions.";
    public override readonly aliases = ["perm", "perms", "permissions", "p"];
    public override readonly permissions = [PermissionFlags.ManageGuild];
    public override readonly usage = ["<subcommand> <command_name> [permissions]"];
    public override readonly since = "10.14.1";
    public override readonly subcommands = ["set", "clear", "view"];
    public override readonly subcommandMeta: Record<string, SubcommandMeta> = {
        set: {
            description: "Set permissions for a command.",
            usage: ["<command_name> [subcommand] [permissions]"]
        },
        clear: {
            description: "Clear permissions for a command.",
            usage: ["<command_name> [subcommand]"]
        },
        view: {
            description: "View permissions for a command.",
            usage: ["<command_name> [subcommand]"]
        }
    };

    @Inject()
    private readonly commandManager!: CommandManager;

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("set")
                        .setDescription("Set permissions for a command.")
                        .addStringOption(option =>
                            option
                                .setName("command")
                                .setDescription("The command to manage permissions for.")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("subcommand")
                                .setDescription("The subcommand to manage permissions for.")
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName("permissions")
                                .setDescription("The permissions to set for the command.")
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("clear")
                        .setDescription("Clear permissions for a command.")
                        .addStringOption(option =>
                            option
                                .setName("command")
                                .setDescription("The command to manage permissions for.")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("subcommand")
                                .setDescription("The subcommand to manage permissions for.")
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("view")
                        .setDescription("View permissions for a command.")
                        .addStringOption(option =>
                            option
                                .setName("command")
                                .setDescription("The command to manage permissions for.")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("subcommand")
                                .setDescription("The subcommand to manage permissions for.")
                                .setRequired(false)
                        )
                )
        ];
    }

    public override async execute(context: ChatContext) {
        const subcommand = context.isLegacy()
            ? context.argv[1]
            : context.options.getSubcommand(true);

        if (!subcommand || !this.subcommands.includes(subcommand.toLowerCase())) {
            await context.error(
                "You must provide a valid subcommand. Valid subcommands are: " +
                    this.subcommands.join(", ")
            );
            return;
        }

        const initialCommandName: string | undefined = (
            context.isLegacy() ? context.argv[2] : context.options.getString("command", true)
        )?.toLowerCase();
        const initialSubcommandName = (
            context.isLegacy() ? null : context.options.getString("subcommand", false)
        )?.toLowerCase();
        let commandName: string | undefined = initialCommandName;
        let subcommandName = initialSubcommandName;

        if (!commandName) {
            await context.error("You must provide a command name.");
            return;
        }

        const command = this.commandManager.getCommand(commandName);
        commandName = command?.name;

        if (!commandName || !command) {
            await context.error(
                `The command "${escapeMarkdown(initialCommandName)}" does not exist.`
            );
            return;
        }

        if (subcommandName) {
            if (!command.isolatedSubcommands && !command.subcommands.includes(subcommandName)) {
                await context.error(
                    `The command "${escapeMarkdown(commandName)}" does not have a subcommand named "${escapeMarkdown(subcommandName)}".`
                );

                return;
            }

            if (command.isolatedSubcommands) {
                const subcommand = this.commandManager.getCommand(
                    `${commandName}::${subcommandName}`
                );

                if (!subcommand) {
                    await context.error(
                        `The command "${escapeMarkdown(commandName)}" does not have a subcommand named "${escapeMarkdown(subcommandName)}".`
                    );

                    return;
                }

                subcommandName = subcommand.name.split("::")[1];
            }
        }

        const targetCommand = subcommandName ? `${commandName}::${subcommandName}` : commandName;

        switch (subcommand) {
            case "set": {
                let permissionsString = context.isLegacy()
                    ? context.argv.slice(3).join(" ")
                    : context.options.getString("permissions", false);

                if (!permissionsString || permissionsString?.trim().length === 0) {
                    await context.error("You must provide permissions to set.");
                    return;
                }

                if (permissionsString?.trim().toLowerCase() === "none") {
                    permissionsString = "";
                }

                const permissions = permissionsString?.split(/\s+/).filter(Boolean) ?? null;

                for (const permission of permissions) {
                    if (!(permission in PermissionFlags)) {
                        await context.error(
                            `The permission \`${escapeMarkdown(permission)}\` is invalid.`
                        );
                        return;
                    }
                }

                let overwrite =
                    await this.application.database.query.commandPermissionOverwrites.findFirst({
                        where: and(
                            eq(commandPermissionOverwrites.commands, [targetCommand]),
                            eq(commandPermissionOverwrites.guildId, context.guildId)
                        )
                    });

                if (!overwrite) {
                    overwrite = (
                        await this.application.database.drizzle
                            .insert(commandPermissionOverwrites)
                            .values({
                                guildId: context.guildId,
                                commands: [targetCommand],
                                requiredDiscordPermissions: permissions,
                                onMatch: CommandPermissionOverwriteAction.Allow
                            })
                            .returning()
                    )[0];
                } else {
                    overwrite = (
                        await this.application.database.drizzle
                            .update(commandPermissionOverwrites)
                            .set({
                                requiredDiscordPermissions: permissions
                            })
                            .where(eq(commandPermissionOverwrites.id, overwrite.id))
                            .returning()
                    )[0];
                }

                this.commandManager.invalidatePermissionOverwrite(overwrite);

                await context.success(
                    `Successfully set permissions for the command \`${escapeMarkdown(targetCommand)}\`.`
                );
                break;
            }

            case "clear": {
                const result = await this.application.database.drizzle
                    .delete(commandPermissionOverwrites)
                    .where(
                        and(
                            arrayContains(commandPermissionOverwrites.commands, [targetCommand]),
                            eq(commandPermissionOverwrites.guildId, context.guildId)
                        )
                    )
                    .returning();

                if (result.length === 0) {
                    await context.error(
                        `No permissions were found for the command \`${escapeMarkdown(targetCommand)}\`.`
                    );
                    return;
                }

                for (const overwrite of result) {
                    this.commandManager.invalidatePermissionOverwrite(overwrite);
                }

                await context.success(
                    `Successfully cleared **${result.length}** permissions for the command \`${escapeMarkdown(targetCommand)}\`.`
                );
                break;
            }

            case "view": {
                const overwriteCount: number = (
                    await this.application.database.drizzle
                        .select({
                            count: count(commandPermissionOverwrites.id)
                        })
                        .from(commandPermissionOverwrites)
                        .where(
                            and(
                                arrayContains(commandPermissionOverwrites.commands, [
                                    targetCommand
                                ]),
                                eq(commandPermissionOverwrites.guildId, context.guildId)
                            )
                        )
                )[0].count;

                this.application.logger.debug("count", overwriteCount);

                const pagination = Pagination.withFetcher<CommandPermissionOverwrite>(
                    async ({ limit, page }) => {
                        return {
                            data: await this.application.database.query.commandPermissionOverwrites.findMany(
                                {
                                    where: and(
                                        arrayContains(commandPermissionOverwrites.commands, [
                                            targetCommand
                                        ]),
                                        eq(commandPermissionOverwrites.guildId, context.guildId)
                                    ),
                                    limit,
                                    offset: (page - 1) * limit
                                }
                            )
                        };
                    }
                )
                    .setLimit(10)
                    .setCountGetter(async () => overwriteCount)
                    .setMaxTimeout(Pagination.DEFAULT_TIMEOUT)
                    .setMessageOptionsBuilder(async ({ data, maxPages, page }) => {
                        let content = "";

                        for (const overwrite of data) {
                            content += `### Overwrite #${overwrite.id}\n`;
                            const permissions = Array.isArray(overwrite.requiredDiscordPermissions)
                                ? overwrite.requiredDiscordPermissions.join(", ")
                                : "";
                            const users = Array.isArray(overwrite.requiredUsers)
                                ? overwrite.requiredUsers.map(id => `<@${id}> [${id}]`).join(", ")
                                : "";
                            const roles = Array.isArray(overwrite.requiredRoles)
                                ? overwrite.requiredRoles.map(id => `<@&${id}> [${id}]`).join(", ")
                                : "";
                            const action =
                                overwrite.onMatch === CommandPermissionOverwriteAction.Allow
                                    ? "Allow"
                                    : "Deny";

                            if (permissions) {
                                content += `- **Permissions:** ${permissions}\n`;
                            }

                            if (users) {
                                content += `- **Users:** ${users}\n`;
                            }

                            if (roles) {
                                content += `- **Roles:** ${roles}\n`;
                            }

                            content += `- **Action:** ${action}\n\n`;
                        }

                        return {
                            content: `
                              ## Permissions for \`${escapeMarkdown(targetCommand)}\`
                              ${content || "*No permission overwrites were found for this command.*"}
                              -# Page ${page} of ${maxPages || 1}
                            `.replace(/(\n\s+)/g, "\n")
                        };
                    });

                const message = await context.reply(
                    (await pagination.getMessageOptions()) as InteractionReplyOptions &
                        MessageReplyOptions
                );
                pagination.setInitialMessage(message);
                break;
            }
        }
    }
}

export default PermissionCommand;
