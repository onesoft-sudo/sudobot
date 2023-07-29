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
import { AxiosError } from "axios";
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

    async createSnippet({ name, content, attachments, guildId, userId, roles, channels, users, randomize }: CreateSnippetOptions) {
        if (!content && (!attachments || attachments.length === 0)) {
            return { error: "Content or attachment is required to create a snippet" };
        }

        if (this.snippets[guildId].has(name)) {
            return { error: "A snippet with the same name already exists" };
        }

        if (this.client.commands.has(name)) {
            return { error: "Sorry, there's a built-in internal command already with that name" };
        }

        const filesDownloaded: string[] = [];

        log(attachments);
        log(this.client.configManager.systemConfig.snippets?.save_attachments);

        if (attachments && this.client.configManager.systemConfig.snippets?.save_attachments) {
            for (const attachment of attachments) {
                const { error, name } = await this.downloadAttachment({
                    guildId,
                    proxyURL: attachment.proxyURL
                });

                if (error) {
                    await this.removeFiles(filesDownloaded, guildId);

                    if (error instanceof Error && error.message.startsWith("HTTP error")) {
                        return { error: error.message };
                    }

                    return { error: "Could not save attachments: An internal error has occurred" };
                }

                filesDownloaded.push(name);
            }
        }

        const snippet = await this.client.prisma.snippet.create({
            data: {
                content: content ? [content] : undefined,
                guild_id: guildId,
                user_id: userId,
                attachments: filesDownloaded,
                channels,
                roles,
                users,
                name,
                randomize
            }
        });

        this.snippets[guildId].set(snippet.name, snippet);

        return { snippet };
    }

    async downloadAttachment({ guildId, proxyURL }: { proxyURL: string; guildId: string }) {
        try {
            const splittedName = basename(proxyURL).split(".");
            const extension = splittedName.pop()!;
            splittedName.push(`_${Date.now()}_${Math.random() * 10000000}`);
            splittedName.push(extension);
            const fileName = splittedName.join(".").replace(/\//g, "_");
            const path = sudoPrefix(`storage/snippet_attachments/${guildId}`, true);

            await downloadFile({
                url: proxyURL,
                path,
                name: fileName
            });

            return { path, name: fileName };
        } catch (e) {
            logError(e);
            return { error: e as Error | AxiosError };
        }
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

        if (snippet.randomize && snippet.attachments.length > 0) {
            const randomAttachment = snippet.attachments[Math.floor(Math.random() * snippet.attachments.length)];

            const file = sudoPrefix(`storage/snippet_attachments/${guildId}/${randomAttachment}`, false);

            if (!existsSync(file)) {
                logWithLevel(LogLevel.CRITICAL, `Could find attachment: ${file}`);
            } else {
                files.push(file);
            }
        } else {
            for (const attachment of snippet.attachments) {
                const file = sudoPrefix(`storage/snippet_attachments/${guildId}/${attachment}`, false);

                if (!existsSync(file)) {
                    logWithLevel(LogLevel.CRITICAL, `Could find attachment: ${file}`);
                    continue;
                }

                files.push(file);
            }
        }

        return {
            options: {
                content: snippet.content[snippet.randomize ? Math.floor(Math.random() * snippet.content.length) : 0] ?? undefined,
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

    async toggleRandomization({ guildId, name }: CommonSnippetActionOptions) {
        if (!this.snippets[guildId].has(name)) return { error: "Snippet does not exist" };

        const snippet = await this.client.prisma.snippet.findFirst({
            where: {
                name,
                guild_id: guildId
            }
        });

        if (!snippet) {
            return { error: "Snippet does not exist" };
        }

        await this.client.prisma.snippet.update({
            where: {
                id: snippet.id
            },
            data: {
                randomize: !snippet.randomize
            }
        });

        const localSnippet = this.snippets[guildId].get(name)!;
        localSnippet.randomize = !snippet.randomize;
        this.snippets[guildId].set(name, localSnippet);

        return { randomization: !snippet.randomize };
    }

    async pushFile({ files, guildId, name }: CommonSnippetActionOptions & { files: string[] }) {
        if (!this.snippets[guildId].has(name)) return { error: "Snippet does not exist" };

        const filesDownloaded = [];

        for (const file of files) {
            const { error, name } = await this.downloadAttachment({
                guildId,
                proxyURL: file
            });

            if (error) {
                await this.removeFiles(filesDownloaded, guildId);

                if (error instanceof Error && error.message.startsWith("HTTP error")) {
                    return { error: error.message };
                }

                return { error: "Could not save attachments: An internal error has occurred" };
            }

            filesDownloaded.push(name);
        }

        const { count } = await this.client.prisma.snippet.updateMany({
            where: {
                name,
                guild_id: guildId
            },
            data: {
                attachments: {
                    push: filesDownloaded
                }
            }
        });

        if (count === 0) return { error: "Snippet does not exist" };

        const snippet = this.snippets[guildId].get(name)!;
        snippet.attachments.push(...filesDownloaded);
        this.snippets[guildId].set(name, snippet);

        return { count };
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
    randomize?: boolean;
}
