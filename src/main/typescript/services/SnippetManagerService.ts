import { Inject } from "@framework/container/Inject";
import { Permission } from "@framework/permissions/Permission";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import type ConfigurationManager from "@main/services/ConfigurationManager";
import type DirectiveParsingService from "@main/services/DirectiveParsingService";
import PermissionManagerService from "@main/services/PermissionManagerService";
import { downloadFile } from "@main/utils/download";
import { systemPrefix } from "@main/utils/utils";
import { PermissionLogicMode, Snippet } from "@prisma/client";
import {
    APIEmbed,
    Collection,
    Message,
    PermissionFlagsBits,
    PermissionsString,
    Snowflake
} from "discord.js";
import { existsSync } from "fs";
import { mkdir, rm } from "fs/promises";
import { join } from "path";

@Name("snippetManagerService")
class SnippetManagerService extends Service {
    private readonly cache = new Collection<`${string}_${string}`, Snippet>();

    @Inject("directiveParsingService")
    private readonly directiveParsingService!: DirectiveParsingService;

    @Inject("permissionManager")
    private readonly permissionManagerService!: PermissionManagerService;

    @Inject("configManager")
    private readonly configurationManager!: ConfigurationManager;

    public override async boot(): Promise<void> {
        const snippets = await this.application.prisma.snippet.findMany();

        for (const snippet of snippets) {
            this.cache.set(`${snippet.guildId}_${snippet.name}`, snippet);

            if (snippet.aliases?.length) {
                for (const alias of snippet.aliases) {
                    this.cache.set(`${snippet.guildId}_${alias}`, snippet);
                }
            }
        }

        this.application.logger.info(`Discovered ${snippets.length} snippets.`);
    }

    public hasSnippet(name: string, guildId: string): boolean {
        return this.cache.has(`${guildId}_${name}`);
    }

    private async checkRequirements(message: Message<true>, snippet: Snippet): Promise<boolean> {
        if (!message.member) {
            return false;
        }

        if (snippet.channels.length > 0 && !snippet.channels.includes(message.guildId)) {
            return false;
        }

        if (snippet.users.length > 0 && !snippet.users.includes(message.author.id)) {
            return false;
        }

        if (snippet.roles.length > 0) {
            for (const role of message.member.roles.cache.keys()) {
                if (!snippet.roles.includes(role)) {
                    return false;
                }
            }
        }

        try {
            const details = await this.permissionManagerService.getMemberPermissions(
                message.member
            );

            if (snippet.level !== null) {
                const permissionManager =
                    this.configurationManager.config[message.guildId]?.permissions.mode ??
                    "discord";

                if (permissionManager === "levels") {
                    const level = (details as unknown as { level: number }).level;

                    if (level < snippet.level) {
                        return false;
                    }
                }
            }

            if (snippet.permissions.length > 0) {
                if (snippet.permissionMode === "AND") {
                    for (const permission of snippet.permissions) {
                        if (permission in PermissionFlagsBits) {
                            if (
                                !details.grantedDiscordPermissions.has(
                                    permission as PermissionsString
                                )
                            ) {
                                return false;
                            }
                        } else {
                            if (
                                !details.grantedSystemPermissions.has(
                                    permission as keyof SystemPermissionStrings
                                )
                            ) {
                                return false;
                            }
                        }
                    }
                } else {
                    for (const permission of snippet.permissions) {
                        if (permission in PermissionFlagsBits) {
                            if (
                                details.grantedDiscordPermissions.has(
                                    permission as PermissionsString
                                )
                            ) {
                                return true;
                            }
                        } else {
                            if (
                                details.grantedSystemPermissions.has(
                                    permission as keyof SystemPermissionStrings
                                )
                            ) {
                                return true;
                            }
                        }
                    }

                    return false;
                }
            }
        } catch (error) {
            this.application.logger.error(error);
            return false;
        }

        return true;
    }

    public async resolveMessageOptions(message: Message<true>, name: string) {
        const snippet = this.cache.get(`${message.guildId}_${name}`);

        if (!snippet || !message.member || !(await this.checkRequirements(message, snippet))) {
            return null;
        }

        const content =
            snippet.content[
                snippet.randomize ? Math.floor(Math.random() * snippet.content.length) : 0
            ];
        const files = [];

        if (
            snippet.attachments.length > 0 &&
            !existsSync(systemPrefix(join("storage/snippets", message.guildId)))
        ) {
            await mkdir(systemPrefix(join("storage/snippets", message.guildId)), {
                recursive: true
            });
        }

        for (const name of snippet.attachments) {
            this.application.logger.debug(
                `Attachment: ${systemPrefix(join("storage/snippets", message.guildId, name))}`
            );

            files.push({
                attachment: systemPrefix(join("storage/snippets", message.guildId, name)),
                name
            });
        }

        const { data, output } = await this.directiveParsingService.parse(content);
        const options = {
            files,
            content: output.trim() === "" ? undefined : output,
            embeds: (data.embeds as APIEmbed[]) ?? []
        };

        return {
            snippet,
            options
        };
    }

    public async createSnippet(options: CreateSnippetOptions): Promise<Snippet> {
        const content = typeof options.content === "string" ? [options.content] : options.content;
        const attachments: string[] = [];

        for (const url of options.attachmentURLs ?? []) {
            const name = `${Date.now()}-${Math.random() * 10_000_000}.${new URL(url).pathname.split(".").pop()}`;
            await downloadFile({
                url,
                path: systemPrefix(join("storage/snippets", options.guildId)),
                name
            });
            attachments.push(name);
        }

        const snippet = await this.application.prisma.snippet.create({
            data: {
                name: options.name,
                guildId: options.guildId,
                userId: options.userId,
                content,
                attachments,
                aliases: options.aliases,
                channels: options.channels,
                users: options.users,
                roles: options.roles,
                level: options.level,
                permissions: options.permissions,
                permissionMode: options.permissionMode
            }
        });

        this.cache.set(`${options.guildId}_${options.name}`, snippet);

        for (const alias of snippet.aliases) {
            this.cache.set(`${options.guildId}_${alias}`, snippet);
        }

        return snippet;
    }

    public async deleteSnippet(name: string, guildId: string): Promise<Snippet | null> {
        const snippet = this.cache.get(`${guildId}_${name}`);

        if (snippet) {
            await this.application.prisma.snippet.delete({
                where: {
                    id: snippet.id
                }
            });

            this.cache.delete(`${guildId}_${name}`);

            for (const alias of snippet.aliases) {
                this.cache.delete(`${guildId}_${alias}`);
            }

            for (const file of snippet.attachments) {
                const path = systemPrefix(join("storage/snippets", guildId, file));

                if (existsSync(path)) {
                    await rm(path);
                }
            }

            return snippet;
        }

        return null;
    }

    public async renameSnippet(name: string, newName: string, guildId: Snowflake) {
        const snippet = this.cache.get(`${guildId}_${name}`);

        if (!snippet || this.cache.has(`${guildId}_${newName}`)) {
            return null;
        }

        await this.application.prisma.snippet.update({
            where: {
                id: snippet.id
            },
            data: {
                name: newName
            }
        });

        this.cache.delete(`${guildId}_${name}`);
        this.cache.set(`${guildId}_${newName}`, snippet);
        return snippet;
    }

    public async getSnippets(guildId: Snowflake): Promise<Snippet[]> {
        const snippets: Snippet[] = [];

        for (const snippet of this.cache.values()) {
            if (snippet.guildId === guildId) {
                snippets.push(snippet);
            }
        }

        return snippets;
    }

    public async updateSnippet(name: string, attribute: string, value: string, guildId: Snowflake) {
        const snippet = this.cache.get(`${guildId}_${name}`);

        if (!snippet) {
            return {
                error: "Snippet does not exist."
            };
        }

        switch (attribute) {
            case "level":
                if (this.configurationManager.config[guildId]?.permissions.mode !== "levels") {
                    return {
                        error: "Permission levels are not enabled in this server."
                    };
                }

                await this.application.prisma.snippet.update({
                    where: {
                        id: snippet.id
                    },
                    data: {
                        level: parseInt(value)
                    }
                });

                break;

            case "perm":
            case "permission":
                {
                    const permissions = value.split(" ");

                    for (const permission of permissions) {
                        if (
                            !(permission in PermissionFlagsBits) &&
                            !Permission.fromString(permission)
                        ) {
                            return {
                                error: "Invalid permission: " + permission
                            };
                        }
                    }

                    await this.application.prisma.snippet.update({
                        where: {
                            id: snippet.id
                        },
                        data: {
                            permissions
                        }
                    });
                }

                break;

            case "pmode":
            case "permission_mode":
                if (value === "AND" || value === "OR") {
                    await this.application.prisma.snippet.update({
                        where: {
                            id: snippet.id
                        },
                        data: {
                            permissionMode: value
                        }
                    });
                } else {
                    return {
                        error: "Permission mode must be either `AND` or `OR`."
                    };
                }

                break;

            case "content":
                await this.application.prisma.snippet.update({
                    where: {
                        id: snippet.id
                    },
                    data: {
                        content: [value]
                    }
                });

                break;

            default:
                return {
                    error: "Invalid attribute: " + attribute
                };
        }

        return { snippet };
    }
}

export type CreateSnippetOptions = {
    name: string;
    guildId: string;
    userId: string;
    content: string | string[];
    attachmentURLs?: string[];
    aliases?: string[];
    channels?: string[];
    users?: string[];
    roles?: string[];
    level?: number;
    permissions?: string[];
    permissionMode?: PermissionLogicMode;
};

export default SnippetManagerService;
