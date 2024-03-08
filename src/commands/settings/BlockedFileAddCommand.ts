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

import { Message, escapeMarkdown } from "discord.js";
import Command, { CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";

export default class BlockedFileAddCommand extends Command {
    public readonly name = "blockedfile__add";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly supportsInteractions = false;
    public readonly supportsLegacy = false;
    public readonly description = "Add a file hash to the blocklist";

    async execute(message: CommandMessage): Promise<CommandReturn> {
        await this.deferIfInteraction(message);
        const attachments =
            message instanceof Message ? [...message.attachments.values()] : [message.options.getAttachment("file", true)];

        if (!this.client.configManager.config[message.guildId!]) {
            return;
        }

        if (!this.client.configManager.config[message.guildId!]!.file_filter?.enabled) {
            await this.error(message, "The blocked file filter is not enabled for this server.");
            return;
        }

        if (attachments.length === 0) {
            await this.error(message, "Please specify at least one file to block!");
            return;
        }

        this.client.configManager.config[message.guildId!]!.file_filter ??= {
            blocked_hashes: {},
            enabled: false,
            disabled_channels: []
        };

        let description = "";

        for (const attachment of attachments) {
            const hash = await this.client.fileFilter.getFileHashFromURL(attachment.proxyURL);

            if (!hash) {
                continue;
            }

            this.client.configManager.config[message.guildId!]!.file_filter!.blocked_hashes[hash] = attachment.contentType;
            description +=
                `* [${escapeMarkdown(attachment.name)}](${attachment.proxyURL}): \`${hash}\`` +
                (attachment.contentType ? ` (${attachment.contentType})` : "") +
                "\n";
        }

        await this.client.configManager.write();
        await this.deferredReply(message, {
            embeds: [
                {
                    description: `${this.emoji("check")} **Successfully blocked the file hashes.**\n\n${description}`,
                    color: 0x007bff
                }
            ]
        });
    }
}
