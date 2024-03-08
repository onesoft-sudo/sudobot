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

import { Attachment, Message, PermissionFlagsBits, Snowflake } from "discord.js";
import crypto from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import Service from "../core/Service";
import { HasEventListeners } from "../types/HasEventListeners";
import { logError, logInfo, logWarn } from "../utils/Logger";
import { downloadFile } from "../utils/download";
import { sudoPrefix } from "../utils/utils";

export const name = "fileFilter";

export default class FileFilterService extends Service implements HasEventListeners {
    async handle(message: Message<boolean>) {
        if (
            message.author.bot ||
            !this.client.configManager.systemConfig.enable_file_filter ||
            !this.client.configManager.config[message.guildId!]?.file_filter?.enabled
        ) {
            return;
        }

        const config = this.client.configManager.config[message.guildId!]?.file_filter;

        if (config?.disabled_channels.includes(message.channelId!)) {
            return false;
        }

        if (await this.client.permissionManager.isImmuneToAutoMod(message.member!, PermissionFlagsBits.ManageGuild)) {
            return false;
        }

        const attachment = await this.checkAttachments(message);

        if (attachment) {
            return attachment;
        }

        return await this.checkAttachmentLinks(message);
    }

    async onMessageCreate(message: Message<boolean>) {
        const info = await this.handle(message);

        if (info) {
            await this.client.loggerService.logFileFilterDeletedMessage(message, {
                contentType: info.attachment ? info.attachment.contentType : undefined,
                hash: info.hash,
                url: info.attachment ? info.attachment.url : info.url!,
                name: info.attachment?.name
            });
        }

        return !!info;
    }

    async getFileHashFromURL(url: string) {
        const name = `filefilter_${Math.round(Math.random()) * 100000}_${Date.now()}`;
        const directory = sudoPrefix("tmp");

        try {
            const { filePath } = await downloadFile({
                url,
                name,
                path: directory
            });

            const recomputedHash = crypto.createHash("sha512");
            recomputedHash.update(await readFile(filePath));
            const hex = recomputedHash.digest("hex");
            recomputedHash.end();

            await rm(filePath);
            return hex;
        } catch (e) {
            logError(e);
            return null;
        }
    }

    private async checkAttachments(message: Message) {
        if (message.attachments.size === 0 || !message.deletable) {
            return null;
        }

        for (const attachment of message.attachments.values()) {
            const hash = await this.findBlockedHash(message.guildId!, attachment);

            if (hash) {
                await message.delete().catch(logError);
                return { attachment, hash, url: undefined };
            }
        }

        return null;
    }

    private async findBlockedHash(guildId: Snowflake, attachment: Attachment) {
        const config = this.client.configManager.config[guildId!]?.file_filter;

        if (!config?.enabled) {
            return null;
        }

        const hex = await this.getFileHashFromURL(attachment.proxyURL);

        for (const hash in config.blocked_hashes) {
            const mimeType = config.blocked_hashes[hash];

            if (attachment.contentType !== mimeType) {
                continue;
            }

            if (attachment.size > 1024 * 1024 * 5) {
                logWarn("Attachment size too large - skipping");
                continue;
            }

            if (hex && hex === hash) {
                logInfo("Attachment filter found a blocked attachment");
                return hex;
            }
        }

        return null;
    }

    // TODO: Implement this
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async checkAttachmentLinks(message: Message): Promise<{ hash: string; url: string; attachment?: Attachment } | null> {
        return null;
    }
}
