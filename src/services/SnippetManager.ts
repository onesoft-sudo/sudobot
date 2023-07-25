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
import { Attachment, Collection, GuildMember, Message, MessageCreateOptions } from "discord.js";
import { existsSync } from "fs";
import fs from "fs/promises";
import { basename } from "path";
import Service from "../core/Service";
import { downloadFile } from "../utils/download";
import { LogLevel, log, logError, logInfo, logWithLevel } from "../utils/logger";
import { sudoPrefix } from "../utils/utils";

export const name = "snippetManager";

export default class SnippetManager extends Service {
    public readonly snippets: Record<string, Collection<string, Snippet>> = {};

    async boot() {
        const snippets = await this.client.prisma.snippet.findMany();

        for (const guildId of this.client.guilds.cache.keys()) {
            this.snippets[guildId] = new Collection<string, Snippet>();
        }

        for (const snippet of snippets) {
            if (!this.snippets[snippet.guild_id]) this.snippets[snippet.guild_id] = new Collection<string, Snippet>();

            this.snippets[snippet.guild_id].set(snippet.name, snippet);
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

        if (this.snippets[guildId].has(name)) {
            return { error: "A snippet with the same name already exists" };
        }

        if (this.client.commands.has(name)) {
            return { error: "Sorry, there's a built-in internal command already with that name" };
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

        this.snippets[guildId].set(snippet.name, snippet);

        return { snippet };
    }

    async deleteSnippet({ name, guildId }: CommonSnippetActionOptions) {
        if (!this.snippets[guildId].has(name)) {
            return { error: "No snippet found with that name" };
        }

        await this.client.prisma.snippet.deleteMany({
            where: {
                guild_id: guildId,
                name
            }
        });

        await this.removeFiles(this.snippets[guildId].get(name)!.attachments, guildId);
        this.snippets[guildId].delete(name);

        return { success: true };
    }

    async renameSnippet({ name, guildId, newName }: CommonSnippetActionOptions & { newName: string }) {
        if (!this.snippets[guildId].has(name)) {
            return { error: "No snippet found with that name" };
        }

        if (this.client.commands.has(newName)) {
            return { error: "Sorry, there's a built-in internal command already with that name" };
        }

        await this.client.prisma.snippet.updateMany({
            where: {
                name,
                guild_id: guildId
            },
            data: {
                name: newName
            }
        });

        const snippet = this.snippets[guildId].get(name)!;
        snippet.name = newName;
        this.snippets[guildId].set(newName, snippet);
        this.snippets[guildId].delete(name);

        return { success: true, snippet };
    }

    async createMessageOptionsFromSnippet({
        name,
        guildId,
        channelId,
        member
    }: CommonSnippetActionOptions & {
        channelId: string;
        member: GuildMember;
    }) {
        if (!this.snippets[guildId]?.has(name)) {
            return { error: "No snippet found with that name", found: false };
        }

        const snippet = this.snippets[guildId].get(name)!;

        if (!snippet.content && snippet.attachments.length === 0)
            throw new Error("Corrupted database: snippet attachment and content both are unusable");

        if (
            (snippet.channels.length > 0 && !snippet.channels.includes(channelId)) ||
            (snippet.users.length > 0 && !snippet.users.includes(member.user.id)) ||
            (snippet.roles.length > 0 && !member.roles.cache.hasAll(...snippet.roles))
        ) {
            log("Channel/user doesn't have permission to run this snippet.");

            return {
                options: undefined
            };
        }

        const files = [];

        for (const attachment of snippet.attachments) {
            const file = sudoPrefix(`storage/snippet_attachments/${guildId}/${attachment}`, false);

            if (!existsSync(file)) {
                logWithLevel(LogLevel.CRITICAL, `Could find attachment: ${file}`);
                continue;
            }

            files.push(file);
        }

        return {
            options: {
                content: snippet.content ?? undefined,
                files
            } as MessageCreateOptions,
            found: true
        };
    }

    async onMessageCreate(message: Message, commandName: string) {
        const { options, found } = await this.createMessageOptionsFromSnippet({
            name: commandName,
            guildId: message.guildId!,
            channelId: message.channelId!,
            member: message.member! as GuildMember
        });

        if (!found || !options) {
            log("Snippet not found");
            return false;
        }

        await message.channel.send(options).catch(logError);
        return true;
    }
}

interface CommonSnippetActionOptions {
    name: string;
    guildId: string;
}

interface CreateSnippetOptions extends CommonSnippetActionOptions {
    content?: string;
    attachments?: Attachment[];
    userId: string;
    roles: string[];
    users: string[];
    channels: string[];
}
