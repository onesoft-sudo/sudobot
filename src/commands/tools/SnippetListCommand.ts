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

import { EmbedBuilder, PermissionsBitField } from "discord.js";
import Command, { BasicCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import Pagination from "../../utils/Pagination";
import { log } from "../../utils/logger";

export default class SnippetListCommand extends Command {
    public readonly name = "snippet__list";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ModerateMembers,
        PermissionsBitField.Flags.ManageMessages
    ];
    public readonly aliases: string[] = ["listtags", "taglist", "listsnippets", "snippetlist"];
    public readonly permissionMode = "or";

    async execute(message: CommandMessage, context: BasicCommandContext): Promise<CommandReturn> {
        const snippets = [];
        const iterator = this.client.snippetManager.snippets.keys();

        for (const snippet of iterator) {
            if (snippet.startsWith(`${message.guildId}_`)) {
                snippets.push(snippet.replace(`${message.guildId}_`, ""));
            }
        }

        if (snippets.length === 0) {
            await this.deferredReply(message, "This server does not have any snippets/tags yet.");
            return;
        }

        const paginator = new Pagination(snippets, {
            embedBuilder({ data, maxPages, currentPage }): EmbedBuilder {
                return new EmbedBuilder({
                    author: {
                        name: `Snippets/tags in ${message.guild?.name}`,
                        iconURL: message.guild?.iconURL() ?? undefined
                    },
                    description: data.length === 0 ? "Nothing to show." : `\`${data.join("`, `")}\``,
                    footer: {
                        text: `Page ${currentPage} of ${maxPages}`
                    },
                    color: 0x007bff
                }).setTimestamp();
            },
            client: this.client,
            timeout: 180_000,
            guildId: message.guildId!,
            channelId: message.channelId!,
            userId: message.member!.user.id,
            limit: 40
        });

        const reply = await this.deferredReply(message, await paginator.getMessageOptions());
        log(reply);
        await paginator.start(reply);
    }
}
