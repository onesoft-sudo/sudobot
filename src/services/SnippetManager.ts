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

import { PermissionRole, Snippet } from "@prisma/client";
import { AxiosError } from "axios";
import { Attachment, Collection, GuildMember, Message, MessageCreateOptions, PermissionFlagsBits, Snowflake } from "discord.js";
import { existsSync } from "fs";
import fs from "fs/promises";
import { basename } from "path";
import Command, { CommandMessage } from "../core/Command";
import Service from "../core/Service";
import { downloadFile } from "../utils/download";
import { LogLevel, log, logError, logInfo, logWithLevel } from "../utils/logger";
import { sudoPrefix } from "../utils/utils";

export const name = "snippetManager";

type SnippetWithPermissions = Snippet & { permission_roles: PermissionRole[] };

export default class SnippetManager extends Service {
    public readonly snippets = new Collection<`${Snowflake}_${string}`, SnippetWithPermissions>();

    async boot() {
        const snippets = await this.client.prisma.snippet.findMany({
            include: {
                permission_roles: true
            }
        });

        for (const snippet of snippets) {
            this.snippets.set(`${snippet.guild_id}_${snippet.name}`, snippet);
        }
    }

    async removeFiles(fileNames: string[], guildId: string) {
        for (const name of fileNames) {
            const filePath = `${sudoPrefix(`storage/snippet_attachments/${guildId}`, true)}/${name}`;
            logInfo("Attempting to remove file: " + filePath);
            await fs.rm(filePath).catch(logError);
        }
    }

    async createSnippet({
        name,
        content,
        attachments,
        guildId,
        userId,
        roles,
        channels,
        users,
        randomize
    }: CreateSnippetOptions) {
        if (!content && (!attachments || attachments.length === 0)) {
            return { error: "Content or attachment is required to create a snippet" };
        }

        if (this.snippets.has(`${guildId}_${name}`)) {
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
            },
            include: {
                permission_roles: true
            }
        });

        this.snippets.set(`${guildId}_${snippet.name}`, snippet);

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
        if (!this.snippets.has(`${guildId}_${name}`)) {
            return { error: "No snippet found with that name" };
        }

        await this.client.prisma.snippet.deleteMany({
            where: {
                guild_id: guildId,
                name
            }
        });

        await this.removeFiles(this.snippets.get(`${guildId}_${name}`)!.attachments, guildId);
        this.snippets.delete(`${guildId}_${name}`);

        return { success: true };
    }

    async renameSnippet({ name, guildId, newName }: CommonSnippetActionOptions & { newName: string }) {
        if (!this.snippets.has(`${guildId}_${name}`)) {
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

        const snippet = this.snippets.get(`${guildId}_${name}`)!;
        snippet.name = newName;
        this.snippets.set(`${guildId}_${newName}`, snippet);
        this.snippets.delete(`${guildId}_${name}`);

        return { success: true, snippet };
    }

    checkPermissions(snippet: SnippetWithPermissions, member: GuildMember, guildId: string, channelId?: string) {
        if (member.permissions.has(PermissionFlagsBits.Administrator, true)) return true;

        if (
            (snippet.channels.length > 0 && channelId && !snippet.channels.includes(channelId)) ||
            (snippet.users.length > 0 && !snippet.users.includes(member.user.id)) ||
            (snippet.roles.length > 0 && !member.roles.cache.hasAll(...snippet.roles))
        ) {
            log("Channel/user doesn't have permission to run this snippet.");
            return false;
        }

        const guildUsesPermissionLevels = this.client.configManager.config[guildId]?.permissions.mode === "levels";
        const memberPermissions = this.client.permissionManager.getMemberPermissions(member, true);

        const snippetPermissions =
            guildUsesPermissionLevels && typeof snippet.level === "number"
                ? this.client.permissionManager.levels[snippet.level] ?? ["Administrator"]
                : this.client.permissionManager.getPermissionsFromPermissionRoles(snippet.permission_roles, guildId);

        for (const permission of snippetPermissions) {
            if (!memberPermissions.has(permission)) {
                log("User doesn't have enough permission to run this snippet. (hybrid permission system)");
                return false;
            }
        }

        return true;
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
        if (!this.snippets?.has(`${guildId}_${name}`)) {
            return { error: "No snippet found with that name", found: false };
        }

        const snippet = this.snippets.get(`${guildId}_${name}`)!;

        if (!snippet.content && snippet.attachments.length === 0)
            throw new Error("Corrupted database: snippet attachment and content both are unusable");

        if (!this.checkPermissions(snippet, member, guildId, channelId)) {
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
            log("Snippet not found or permission error");
            return false;
        }

        await message.channel.send(options).catch(logError);
        return true;
    }

    async toggleRandomization({ guildId, name }: CommonSnippetActionOptions) {
        if (!this.snippets.has(`${guildId}_${name}`)) return { error: "Snippet does not exist" };

        const snippet = this.snippets.get(`${guildId}_${name}`);

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

        const localSnippet = this.snippets.get(`${guildId}_${name}`)!;
        localSnippet.randomize = !snippet.randomize;
        this.snippets.set(`${guildId}_${name}`, localSnippet);

        return { randomization: !snippet.randomize };
    }

    async pushFile({ files, guildId, name }: CommonSnippetActionOptions & { files: string[] }) {
        if (!this.snippets.has(`${guildId}_${name}`)) return { error: "Snippet does not exist" };

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

        const snippet = this.snippets.get(`${guildId}_${name}`)!;
        snippet.attachments.push(...filesDownloaded);
        this.snippets.set(`${guildId}_${name}`, snippet);

        return { count };
    }

    async checkPermissionInSnippetCommands(name: string, message: CommandMessage, command: Command) {
        const snippet = this.snippets.get(`${message.guildId!}_${name}`);

        if (!snippet) {
            await command.error(message, "No snippet found with that name!");
            return false;
        }

        if (!this.client.snippetManager.checkPermissions(snippet, message.member! as GuildMember, message.guildId!)) {
            await command.error(message, "You don't have permission to modify this snippet!");
            return false;
        }

        return true;
    }

    async updateSnippet({
        channels,
        content,
        guildId,
        name,
        randomize,
        roles,
        users,
        permissionRoleName,
        level
    }: Partial<Omit<CreateSnippetOptions, "attachments" | "userId">> &
        CommonSnippetActionOptions & { permissionRoleName?: string; level?: number }) {
        if (!this.snippets.has(`${guildId}_${name}`)) {
            return { error: "No snippet found with that name" };
        }

        const snippet = this.snippets.get(`${guildId}_${name}`)!;

        let permissionRole: PermissionRole | null = null;

        if (permissionRoleName) {
            permissionRole = await this.client.prisma.permissionRole.findFirst({
                where: {
                    guild_id: guildId,
                    name: permissionRoleName
                }
            });

            if (!permissionRole) {
                return { error: "No named permission role found with the given name!" };
            }
        }

        const updatedSnippet = await this.client.prisma.snippet.update({
            where: {
                id: snippet.id
            },
            data: {
                content: content ? [content] : undefined,
                channels,
                roles,
                randomize,
                users,
                permission_roles: permissionRole
                    ? {
                          connect: {
                              id: permissionRole.id
                          }
                      }
                    : undefined,
                level
            },
            include: {
                permission_roles: true
            }
        });

        this.snippets.set(`${guildId}_${name}`, updatedSnippet);

        return {
            updatedSnippet
        };
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
