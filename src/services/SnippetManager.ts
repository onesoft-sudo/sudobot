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

import { Snippet } from "@prisma/client";
import { Attachment, Collection } from "discord.js";
import fs from "fs/promises";
import { basename } from "path";
import Service from "../core/Service";
import { downloadFile } from "../utils/download";
import { log, logError, logInfo } from "../utils/logger";
import { sudoPrefix } from "../utils/utils";

export const name = "snippetManager";

export default class SnippetManager extends Service {
    public readonly snippets = new Collection<string, Snippet>();

    async boot() {
        const snippets = await this.client.prisma.snippet.findMany();

        for (const snippet of snippets) {
            this.snippets.set(snippet.name, snippet);
        }
    }

    async removeFiles(fileNames: string[], guildId: string) {
        for (const name of fileNames) {
            const filePath = `${sudoPrefix(`storage/snippet_attachments/${guildId}`, true)}/${name}`;
            logInfo("Attempting to remove file: " + filePath);
            await fs.rm(filePath).catch(logError);
        }
    }

    async createSnippet({ name, content, attachments, guildId, userId, roles, channels, users }: CreateSnippetOptions) {
        if (!content && (!attachments || attachments.length === 0)) {
            return { error: "Content or attachment is required to create a snippet" };
        }

        if (this.snippets.has(name)) {
            return { error: "A snippet with the same name already exists" };
        }

        const filesDownloaded = [];

        log(attachments);
        log(this.client.configManager.systemConfig.snippets?.save_attachments);

        if (attachments && this.client.configManager.systemConfig.snippets?.save_attachments) {
            for (const attachment of attachments) {
                try {
                    const splittedName = basename(attachment.proxyURL).split(".");
                    const extension = splittedName.pop()!;
                    splittedName.push(`_${Date.now()}_${Math.random() * 10000000}`);
                    splittedName.push(extension);
                    const fileName = splittedName.join(".").replace(/\//g, "_");

                    await downloadFile({
                        url: attachment.proxyURL,
                        path: sudoPrefix(`storage/snippet_attachments/${guildId}`, true),
                        name: fileName
                    });

                    filesDownloaded.push(fileName);
                } catch (e) {
                    logError(e);
                    await this.removeFiles(filesDownloaded, guildId);

                    if (e instanceof Error && e.message.startsWith("HTTP error")) {
                        return { error: e.message };
                    }

                    return { error: "Could not save attachments: An internal error has occurred" };
                }
            }
        }

        const snippet = await this.client.prisma.snippet.create({
            data: {
                content,
                guild_id: guildId,
                user_id: userId,
                attachments: filesDownloaded,
                channels,
                roles,
                users,
                name
            }
        });

        this.snippets.set(snippet.name, snippet);

        return { snippet };
    }

    async deleteSnippet({ name, guildId }: Pick<CreateSnippetOptions, "name" | "guildId">) {
        if (!this.snippets.has(name)) {
            return { error: "No snippet found with that name" };
        }

        await this.client.prisma.snippet.deleteMany({
            where: {
                guild_id: guildId,
                name
            }
        });

        await this.removeFiles(this.snippets.get(name)!.attachments, guildId);
        this.snippets.delete(name);

        return { success: true };
    }
}

interface CreateSnippetOptions {
    name: string;
    content?: string;
    attachments?: Attachment[];
    guildId: string;
    userId: string;
    roles: string[];
    users: string[];
    channels: string[];
}
