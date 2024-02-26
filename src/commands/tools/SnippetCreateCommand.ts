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

import { Message, PermissionsBitField, escapeCodeBlock, escapeInlineCode } from "discord.js";
import Command, { ArgumentType, BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { log } from "../../utils/Logger";

export default class SnippetCreateCommand extends Command {
    public readonly name = "snippet__create";
    public readonly validationRules: ValidationRule[] = [
        {
            types: [ArgumentType.String],
            errors: {
                required: "Please specify a name for this new snippet/tag!",
                "type:invalid": "Please specify a valid snippet/tag name!"
            },
            name: "name"
        },
        {
            types: [ArgumentType.StringRest],
            errors: {
                required: "Please specify the content of this new snippet/tag!",
                "type:invalid": "Please specify valid content for this new snippet/tag"
            },
            name: "content",
            optional: true
        }
    ];
    public readonly permissions = [
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.ManageMessages
    ];
    public readonly aliases: string[] = ["tagcreate", "addtag", "maketag", "addsnippet"];
    public readonly permissionMode = "or";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const name: string = context.isLegacy ? context.parsedNamedArgs.name : context.options.getString("name", true);

        if (/\s/.test(name)) {
            await this.error(message, "Snippet name cannot contain spaces!");
            return;
        }

        const content: string | undefined = context.isLegacy
            ? context.parsedNamedArgs.content
            : context.options.getString("content", true);

        if (message instanceof Message && !content && message.attachments.size === 0) {
            await this.error(message, "Please either specify text content or attachments to put inside the new snippet!");
            return;
        }

        log("Name: " + name);
        log("Content: " + content);

        const { error } = await this.client.snippetManager.createSnippet({
            name,
            content,
            channels: [],
            guildId: message.guildId!,
            roles: [],
            users: [],
            userId: message.member!.user.id,
            attachments: message instanceof Message ? [...message.attachments.values()] : undefined,
            randomize: context.isLegacy ? false : context.options.getBoolean("randomize") ?? false
        });

        if (error) {
            await this.error(message, error);
            return;
        }

        await this.deferredReply(
            message,
            `${this.emoji("check")} Successfully created snippet \`${escapeInlineCode(escapeCodeBlock(name))}\`${
                !this.client.configManager.systemConfig.snippets?.save_attachments &&
                message instanceof Message &&
                message.attachments.size > 0
                    ? `\nYour message attachments were not saved. Please use links instead.`
                    : ""
            }`
        );
    }
}
