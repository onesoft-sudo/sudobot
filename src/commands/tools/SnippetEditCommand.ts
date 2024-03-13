/**
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { Message, PermissionsBitField, PermissionsString } from "discord.js";
import { logError } from "../../components/io/Logger";
import Command, { ArgumentType, CommandReturn, ValidationRule } from "../../core/Command";
import { LegacyCommandContext } from "../../services/CommandManager";

export default class SnippetEditCommand extends Command {
    public readonly name = "snippet__edit";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            errors: {
                required: "Please specify the name of the snippet/tag to edit!",
                "type:invalid": "Please specify a valid snippet/tag name!"
            },
            name: "name"
        },
        {
            types: [ArgumentType.String],
            errors: {
                required:
                    "Please specify what to edit in the snippet! One of these can be specified: `level`, `permission` (`perm`), `content`",
                "type:invalid":
                    "Please specify a valid attribute of the snippet to edit! One of these can be specified: `level`, `permission` (`perm`), `content`"
            },
            name: "attr"
        }
    ];
    public readonly permissions = [
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.ManageMessages
    ];
    public readonly permissionMode = "or";
    public readonly aliases: string[] = [
        "editsnippet",
        "snippetedit",
        "tagedit",
        "edittag",
        "updatetag"
    ];
    public readonly beta: boolean = true;
    public readonly supportsInteractions = false;

    async execute(message: Message, context: LegacyCommandContext): Promise<CommandReturn> {
        if (!this.client.configManager.config[message.guildId!]) return;

        const name: string = context.parsedNamedArgs.name;

        if (
            !(await this.client.snippetManager.checkPermissionInSnippetCommands(
                name,
                message,
                this
            ))
        ) {
            return;
        }

        const index = name !== context.args[0] ? 1 : 0;

        if (!context.args[index + 1]) {
            await this.error(message, this.validationRules[1].errors?.required);
            return;
        }

        const attrs = ["level", "permission", "perm", "content"] as const;

        if (!attrs.includes(context.args[index + 1]?.toLowerCase() as (typeof attrs)[number])) {
            await this.error(message, this.validationRules[1].errors?.["type:invalid"]);
            return;
        }

        const attr = context.args[index + 1]?.toLowerCase() as (typeof attrs)[number];

        switch (attr) {
            case "level": {
                if (
                    this.client.configManager.config[message.guildId!]?.permissions.mode !==
                    "levels"
                ) {
                    await this.error(
                        message,
                        "This server does not use the level-based permission system. Please switch to the level-based system to set a permission level for this snippet. Alternatively, if you're using the named permission system, please edit the `permission` (or `perm`) attribute instead."
                    );
                    return;
                }

                if (!context.args[index + 2]) {
                    await this.error(message, "Please specify a permission level to set!");
                    return;
                }

                const level = parseInt(context.args[index + 2]);

                if (isNaN(level) || level < 0 || level > 100) {
                    await this.error(
                        message,
                        "Please specify a valid permission level (0-100) to set!"
                    );
                    return;
                }

                const { error } = await this.client.snippetManager.updateSnippet({
                    name,
                    guildId: message.guildId!,
                    level
                });

                if (error) {
                    await this.error(message, error);
                    return;
                }

                await this.success(message, "Sucessfully updated snippet permission level.");
                break;
            }

            case "perm":
            case "permission": {
                if (!context.args[index + 2]) {
                    await this.error(message, "Please specify permission name(s) to require!");
                    return;
                }

                const permissionNames = context.args.slice(index + 2) as PermissionsString[];

                for (const name of permissionNames) {
                    try {
                        PermissionsBitField.resolve(name);
                    } catch (error) {
                        logError(error);
                        await this.error(message, `\`${name}\` is not a valid permission name!`);
                        return;
                    }
                }

                const { error } = await this.client.snippetManager.updateSnippet({
                    name,
                    guildId: message.guildId!,
                    permissions: permissionNames
                });

                if (error) {
                    await this.error(message, error);
                    return;
                }

                await this.success(message, "Sucessfully updated snippet permissions.");
                break;
            }

            case "content": {
                if (!context.args[index + 2]) {
                    await this.error(message, "Please specify new content for the snippet!");
                    return;
                }

                const content = message.content
                    .slice(this.client.configManager.config[message.guildId!]!.prefix.length)
                    .trimStart()
                    .slice(context.argv[0].length)
                    .trimStart()
                    .slice(context.args[0].length)
                    .trimStart()
                    .slice(context.args[1].length)
                    .trimStart()
                    .slice(index === 1 ? context.args[2].length : 0)
                    .trimStart();

                const { error } = await this.client.snippetManager.updateSnippet({
                    name,
                    guildId: message.guildId!,
                    content
                });

                if (error) {
                    await this.error(message, error);
                    return;
                }

                await this.success(message, "Sucessfully updated snippet content.");
                break;
            }
        }
    }
}
