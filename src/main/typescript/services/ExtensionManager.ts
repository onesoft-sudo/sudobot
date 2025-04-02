/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import Application from "@framework/app/Application";
import EventListener from "@framework/events/EventListener";
import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import type { ClientEvents } from "@framework/types/ClientEvents";
import { getEnvData } from "@main/env/env";
import {
    Extension,
    ExtensionMetadataSchema,
    type ExtensionMetadataType
} from "@main/extensions/Extension";
import { ExtensionInfo } from "@main/extensions/ExtensionInfo";
import { Snowflake } from "discord.js";
import { Response } from "express";
import { existsSync } from "fs";
import fs, { readlink, rm } from "fs/promises";
import path from "path";
import * as tar from "tar";
import { cache } from "../utils/cache";
import { downloadFile } from "../utils/download";
import { request, systemPrefix, wait } from "../utils/utils";
import ConfigurationManager from "./ConfigurationManager";

export const name = "extensionService";

const guildIdResolvers = [
    {
        events: ["applicationCommandPermissionsUpdate"],
        resolver: ([data]: ClientEvents["applicationCommandPermissionsUpdate"]) => data.guildId
    },
    {
        events: [
            "autoModerationActionExecution",
            "autoModerationRuleCreate",
            "autoModerationRuleDelete",
            "autoModerationRuleUpdate"
        ],
        resolver: ([data]: ClientEvents[
            | "autoModerationActionExecution"
            | "autoModerationRuleCreate"
            | "autoModerationRuleDelete"
            | "autoModerationRuleUpdate"]) => data?.guild.id ?? undefined
    },
    {
        events: [
            "messageCreate",
            "normalMessageCreate",
            "normalMessageDelete",
            "normalMessageUpdate",
            "messageDelete",
            "messageUpdate",
            "interactionCreate"
        ],
        resolver: ([data]: ClientEvents[
            | "messageCreate"
            | "messageDelete"
            | "messageUpdate"
            | "interactionCreate"
            | "normalMessageCreate"
            | "normalMessageUpdate"
            | "normalMessageDelete"]) => data?.guild?.id ?? data?.guildId ?? undefined
    },
    {
        events: ["messageDeleteBulk"],
        resolver: ([data]: ClientEvents["messageDeleteBulk"]) => data.first()?.guildId ?? undefined
    },
    {
        events: ["channelCreate", "channelDelete", "channelUpdate", "channelPinsUpdate"],
        resolver: ([data]: ClientEvents[
            | "channelCreate"
            | "channelDelete"
            | "channelUpdate"
            | "channelPinsUpdate"]) => (data.isDMBased() ? undefined : data.guildId)
    },
    {
        events: ["emojiCreate", "emojiDelete", "emojiUpdate"],
        resolver: ([data]: ClientEvents["emojiCreate" | "emojiDelete" | "emojiUpdate"]) =>
            data?.guild?.id ?? undefined
    },
    {
        events: ["messageReactionAdd", "messageReactionRemove", "messageReactionRemoveEmoji"],
        resolver: ([data]: ClientEvents[
            | "messageReactionAdd"
            | "messageReactionRemove"
            | "messageReactionRemoveEmoji"]) => data?.message.guildId ?? undefined
    },
    {
        events: ["messageReactionRemoveAll"],
        resolver: ([data]: ClientEvents["messageReactionRemoveAll"]) => data?.guildId ?? undefined
    },
    {
        events: ["guildAuditLogEntryCreate", "guildMembersChunk", "threadListSync"],
        resolver: ([, data]: ClientEvents[
            | "guildAuditLogEntryCreate"
            | "guildMembersChunk"
            | "threadListSync"]) => data.id ?? undefined
    },
    {
        events: [
            "guildAvailable",
            "guildCreate",
            "guildDelete",
            "guildUpdate",
            "guildUnavailable",
            "guildIntegrationsUpdate"
        ],
        resolver: ([data]: ClientEvents[
            | "guildAvailable"
            | "guildCreate"
            | "guildUpdate"
            | "guildUnavailable"
            | "guildIntegrationsUpdate"]) => data.id ?? undefined
    },
    {
        events: [
            "guildBanAdd",
            "guildBanRemove",
            "guildMemberAdd",
            "guildMemberRemove",
            "guildMemberUpdate",
            "guildMemberAvailable",
            "inviteCreate",
            "inviteDelete",
            "roleCreate",
            "roleDelete"
        ],
        resolver: ([data]: ClientEvents[
            | "guildBanAdd"
            | "guildBanRemove"
            | "guildMemberAdd"
            | "guildMemberRemove"
            | "guildMemberUpdate"
            | "guildMemberAvailable"
            | "inviteCreate"
            | "inviteDelete"
            | "roleCreate"
            | "roleDelete"]) => data.guild?.id ?? undefined
    },
    {
        events: [
            "guildScheduledEventCreate",
            "guildScheduledEventDelete",
            "guildScheduledEventUserAdd",
            "guildScheduledEventUserRemove"
        ],
        resolver: ([data]: ClientEvents[
            | "guildScheduledEventCreate"
            | "guildScheduledEventDelete"
            | "guildScheduledEventUserAdd"
            | "guildScheduledEventUserRemove"]) => data.guild?.id ?? data.guildId ?? undefined
    },
    {
        events: ["guildScheduledEventUpdate"],
        resolver: ([data]: ClientEvents["guildScheduledEventUpdate"]) =>
            data?.guild?.id ?? data?.guildId ?? undefined
    },
    {
        events: [
            "presenceUpdate",
            "roleUpdate",
            "stageInstanceUpdate",
            "stickerUpdate",
            "threadUpdate",
            "voiceStateUpdate"
        ],
        resolver: ([data, data2]: ClientEvents[
            | "presenceUpdate"
            | "roleUpdate"
            | "stageInstanceUpdate"
            | "threadUpdate"
            | "voiceStateUpdate"]) => data?.guild?.id ?? data2.guild?.id ?? undefined
    },
    {
        events: [
            "stageInstanceDelete",
            "stageInstanceCreate",
            "stickerCreate",
            "stickerDelete",
            "threadCreate",
            "threadDelete"
        ],
        resolver: ([data]: ClientEvents[
            | "stageInstanceDelete"
            | "stageInstanceCreate"
            | "stickerCreate"
            | "stickerDelete"
            | "threadCreate"
            | "threadDelete"]) => data?.guild?.id ?? undefined
    },
    {
        events: ["threadMemberUpdate"],
        resolver: ([data, data2]: ClientEvents["threadMemberUpdate"]) =>
            data?.guildMember?.guild.id ?? data2?.guildMember?.guild.id ?? undefined
    },
    {
        events: ["typingStart", "webhookUpdate"],
        resolver: ([data]: ClientEvents["typingStart" | "webhookUpdate"]) =>
            data.guild?.id ?? undefined
    },
    {
        events: ["command"],
        resolver: ([, , , data]: ClientEvents["command"]) => data.guildId ?? undefined
    },
    {
        events: [
            "cacheSweep",
            "debug",
            "error",
            "warn",
            "invalidated",
            "ready",
            "shardReady",
            "shardDisconnect",
            "shardError",
            "shardReconnecting",
            "shardResume"
        ],
        resolver: () => null
    }
] as Array<{
    events: ReadonlyArray<keyof ClientEvents>;
    resolver: Resolver;
}>;

type Resolver = (args: ClientEvents[keyof ClientEvents]) => Snowflake | null | undefined;

function getGuildIdResolversMap() {
    const map = new Map<keyof ClientEvents, Resolver>();

    for (const guildIdResolver of guildIdResolvers) {
        for (const event of guildIdResolver.events) {
            if (map.has(event)) {
                Application.current().logger.warn(
                    "Overlapping Guild ID Resolvers detected: ",
                    event
                );
                Application.current().logger.warn(
                    "This seems to be an internal bug. Please report this issue to the developers."
                );
            }

            map.set(event, guildIdResolver.resolver);
        }
    }

    return map;
}

export type ExtensionConstructor = new (
    manager: ExtensionManager,
    id: string,
    name: string,
    version: string,
    path: string,
    meta: ExtensionMetadataType,
    application: Application
) => Extension;

@Name("extensionManager")
export default class ExtensionManager extends Service {
    private readonly extensionIndexURL =
        "https://raw.githubusercontent.com/onesoft-sudo/sudobot/main/extensions/.extbuilds/index.json";
    protected readonly extensionsPath = getEnvData().EXTENSIONS_DIRECTORY;
    protected readonly guildIdResolvers = getGuildIdResolversMap();

    private readonly downloadProgressStreamEOF = "%";
    private readonly extensions = new Map<string, Extension>();

    public override async boot() {
        if (!this.extensionsPath || !existsSync(this.extensionsPath)) {
            this.application.logger.debug("No extensions found");
            await this.initializeConfigService();
            return;
        }

        await this.loadExtensions();
    }

    public async onInitializationComplete() {
        await this.application
            .getService(ConfigurationManager)
            .registerExtensionConfig(Array.from(this.extensions.values()));
        return this.initializeConfigService();
    }

    public initializeConfigService() {
        return this.application.getService(ConfigurationManager).manualBoot();
    }

    public getInstalledExtensionById<E extends Extension = Extension>(id: string): E | undefined {
        return this.extensions.get(id) as E | undefined;
    }

    public getInstalledExtensions() {
        return Array.from(this.extensions.values());
    }

    public async loadExtensions() {
        if (!this.extensionsPath) {
            return;
        }

        const extensions = await fs.readdir(this.extensionsPath);

        for (const extensionName of extensions) {
            const extensionDirectory = path.resolve(this.extensionsPath, extensionName);
            const isDirectory = (await fs.stat(extensionDirectory)).isDirectory();

            if (!isDirectory || extensionName === ".extbuilds") {
                continue;
            }

            this.application.logger.debug("Loading extension from directory: ", extensionDirectory);

            const packageFile = path.join(extensionDirectory, "package.json");

            if (!existsSync(packageFile)) {
                this.application.logger.error(
                    `Extension ${extensionName} does not have a "package.json" file!`
                );

                continue;
            }

            const metadataFile = path.join(extensionDirectory, "extension.json");

            if (!existsSync(metadataFile)) {
                this.application.logger.error(
                    `Extension ${extensionName} does not have a "extension.json" file!`
                );

                continue;
            }

            try {
                const packageData = JSON.parse(
                    await fs.readFile(packageFile, { encoding: "utf-8" })
                );
                const { version } = packageData;

                const parseResult = ExtensionMetadataSchema.safeParse({
                    ...JSON.parse(await fs.readFile(metadataFile, { encoding: "utf-8" })),
                    package_data: packageData
                });

                if (!parseResult.success) {
                    this.application.logger.error(
                        `Error parsing extension metadata for extension ${extensionName}`
                    );
                    this.application.logger.error(parseResult.error);
                    continue;
                }

                const {
                    main = "index.js",
                    src_main = "index.ts",
                    id,
                    src_directory = "",
                    build_directory = ""
                } = parseResult.data;

                const loadingTypeScript = process.isBun && __filename.endsWith(".ts");
                const mainModule = path.join(
                    extensionDirectory,
                    loadingTypeScript ? src_directory : build_directory,
                    loadingTypeScript ? src_main : main
                );

                const tsconfigPath = path.join(extensionDirectory, "tsconfig.json");
                const bunTsconfigPath = path.join(extensionDirectory, "tsconfig.bun.json");
                const nodeTsconfigPath = path.join(extensionDirectory, "tsconfig.node.json");

                if (loadingTypeScript && !existsSync(bunTsconfigPath)) {
                    this.application.logger.error(
                        `Extension ${extensionName} is being loaded in Bun-TypeScript mode but does not have a "tsconfig.bun.json" file!`
                    );
                    this.application.logger.error("Ignoring extension");
                    continue;
                }

                const tsconfigExists = existsSync(tsconfigPath);

                if (
                    !tsconfigExists ||
                    (await readlink(tsconfigPath).catch(() => "")) !==
                        (loadingTypeScript ? bunTsconfigPath : nodeTsconfigPath)
                ) {
                    if (tsconfigExists) {
                        await fs.rm(tsconfigPath);
                    }

                    if (process.platform === "win32") {
                        await fs.cp(
                            loadingTypeScript ? bunTsconfigPath : nodeTsconfigPath,
                            tsconfigPath
                        );
                    } else {
                        await fs.symlink(
                            loadingTypeScript ? bunTsconfigPath : nodeTsconfigPath,
                            tsconfigPath
                        );
                    }
                }

                const initializer = await this.loadExtensionInitializer({
                    extensionPath: mainModule,
                    extensionName,
                    extensionId: id,
                    meta: parseResult.data,
                    version
                });

                await initializer.initialize();
                this.extensions.set(initializer.id, initializer);
                this.logger.info(`Loaded extension: ${id} (${extensionName})`);
            } catch (error) {
                this.application.logger.error(
                    "Error occurred while trying to load extension",
                    extensionName,
                    error
                );
            }
        }

        await this.onInitializationComplete();
    }

    public async loadCompiledExtension(filePath: string) {
        try {
            const extensionModule = (await import(filePath)) as {
                default: ExtensionConstructor;
                metadata: ExtensionMetadataType;
            };

            if (!extensionModule.default) {
                throw new Error("Extension module does not have a default export");
            }

            const metadata = ExtensionMetadataSchema.parse(extensionModule.metadata);

            const extension = new extensionModule.default(
                this,
                metadata.id,
                metadata.name,
                metadata.package_data.version,
                filePath,
                metadata,
                this.application
            );

            this.application.container.resolveProperties(extensionModule.default, extension);

            this.application.logger.debug(
                "Prepared compiled extension: ",
                extension.id,
                extension.name,
                extension.version
            );

            await extension.initialize();
            extension.postConstruct();
            await extension.register();
            this.extensions.set(extension.id, extension);

            this.logger.info(
                `Loaded extension: ${extension.id} (${extension.name} ${extension.version})`
            );

            return { extension };
        } catch (error) {
            this.application.logger.error(
                "Error occurred while trying to load extension",
                filePath,
                error
            );

            return { error };
        }
    }

    public async loadExtensionInitializer({
        extensionName,
        extensionId,
        extensionPath,
        meta,
        version
    }: {
        extensionPath: string;
        extensionName: string;
        extensionId: string;
        meta: ExtensionMetadataType;
        version: string;
    }) {
        this.application.logger.debug(
            "Attempting to load extension initializer: ",
            extensionName,
            extensionId
        );
        const {
            default: ExtensionClass
        }: {
            default: ExtensionConstructor;
        } = await import(extensionPath);

        const extension = new ExtensionClass(
            this,
            extensionId,
            extensionName,
            version,
            extensionPath,
            meta,
            this.application
        );
        this.application.container.resolveProperties(ExtensionClass, extension);
        return extension;
    }

    public async postConstruct() {
        for (const extension of this.extensions.values()) {
            this.logger.debug(`Setting up extension: ${extension.id} (${extension.name})`);
            extension.postConstruct();
            await extension.register();
        }
    }

    public async loadEvents(extensionId: string, directory: string) {
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const isDirectory = (await fs.lstat(filePath)).isDirectory();

            if (isDirectory) {
                await this.loadEvents(extensionId, filePath);
                continue;
            }

            if ((!file.endsWith(".ts") && !file.endsWith(".js")) || file.endsWith(".d.ts")) {
                continue;
            }

            await this.loadEvent(extensionId, filePath);
        }
    }

    public async loadEvent(extensionId: string, filePath: string) {
        const {
            default: Event
        }: { default: new (application: Application) => EventListener<keyof ClientEvents> } =
            await import(filePath);
        this.loadEventClass(extensionId, Event);
    }

    public loadEventClass(
        extensionId: string,
        Event: new (application: Application) => EventListener<keyof ClientEvents>
    ) {
        const event = new Event(this.application);
        this.application.container.resolveProperties(Event, event);
        this.application
            .getClient()
            .addEventListener(
                event.name,
                this.wrapHandler(extensionId, event.name, event.execute.bind(event))
            );
    }

    public wrapHandler<K extends keyof ClientEvents>(
        extensionId: string,
        eventName: K,
        handler: (...args: ClientEvents[K]) => unknown,
        bail?: boolean
    ) {
        return async (...args: ClientEvents[K]) => {
            const guildId: Snowflake | null | undefined =
                this.guildIdResolvers.get(eventName)?.(args);

            if (guildId === undefined) {
                this.application.logger.error(
                    "Invalid event or failed to fetch guild: ",
                    eventName
                );
                return;
            }

            if (guildId !== null && !this.isEnabled(extensionId, guildId)) {
                this.application.logger.debug("Extension isn't enabled in this guild: ", guildId);
                return;
            }

            this.application.logger.debug("Running: " + eventName + " [" + extensionId + "]");

            try {
                return await handler(...args);
            } catch (e) {
                this.application.logger.error(
                    `Extension error: the extension '${extensionId}' seems to cause this exception`
                );
                this.application.logger.error(e);

                if (bail) {
                    return;
                }
            }
        };
    }

    public isEnabled(extensionId: string, guildId: Snowflake) {
        const { disabled_extensions, enabled } =
            this.application.getService(ConfigurationManager).config[guildId]?.extensions ?? {};
        const { default_mode } =
            this.application.getService(ConfigurationManager).systemConfig.extensions ?? {};
        this.application.logger.debug(default_mode, enabled);
        return (
            (enabled === undefined ? default_mode === "enable_all" : enabled) &&
            !disabled_extensions?.includes(extensionId)
        );
    }

    private async fetchExtensionMetadata() {
        this.application.logger.debug("Fetching extension list metadata");

        const [response, error] = await request({
            method: "GET",
            url: this.extensionIndexURL
        });

        if (error || !response || response.status !== 200) {
            return [null, error] as const;
        }

        return [response.data as Record<string, ExtensionInfo | undefined>, null] as const;
    }

    public async getExtensionMetadata(id: string) {
        const [data, error] = await cache("extension-index", () => this.fetchExtensionMetadata(), {
            ttl: 120_000,
            invoke: true
        });

        return error ? ([null, error] as const) : ([data?.[id], null] as const);
    }

    private writeStream(stream: Response | undefined | null, data: string) {
        if (!stream) {
            return;
        }

        return new Promise<void>(resolve => {
            if (!stream.write(data)) {
                stream.once("drain", resolve);
            } else {
                process.nextTick(resolve);
            }
        });
    }

    public async fetchAndInstallExtension(id: string, stream?: Response) {
        if (!this.extensionsPath) {
            const errorMessage =
                "E: Extensions directory is not set. Please set the EXTENSIONS_DIRECTORY environment variable.\n";
            await this.writeStream(stream, errorMessage);
            return [null, errorMessage];
        }

        await this.writeStream(stream, `Fetching metadata for extension ${id}...\n`);
        const [extension, metadataError] = await this.getExtensionMetadata(id);

        if (metadataError || !extension) {
            await this.writeStream(stream, `E: Failed to fetch metadata of extension: ${id}\n`);
            return [null, metadataError] as const;
        }

        await this.writeStream(
            stream,
            `Retrieving ${extension.name} (${extension.version}) from the SudoBot Extension Repository (SER)...\n`
        );
        await wait(100);
        await this.writeStream(stream, this.downloadProgressStreamEOF);
        await wait(100);
        await this.writeStream(stream, "\n");

        try {
            const { filePath } = await downloadFile({
                url: extension.tarballs[0].url,
                path: systemPrefix("tmp", true),
                name: `${extension.id}-${extension.version}.tar.gz`,
                axiosOptions: {
                    method: "GET",
                    responseType: "stream",
                    onDownloadProgress: async progressEvent => {
                        if (!progressEvent.total) {
                            return;
                        }

                        const percentCompleted = Math.floor(
                            (progressEvent.loaded / progressEvent.total) * 100
                        );

                        await this.writeStream(stream, `${percentCompleted}\n`);
                    }
                }
            });

            await wait(100);
            await this.writeStream(stream, this.downloadProgressStreamEOF);
            await wait(100);
            await this.writeStream(stream, "\n");

            await this.installExtension(filePath, extension, stream);

            try {
                await rm(filePath, { force: true });
            } catch (error) {
                this.application.logger.error(error);
                await this.writeStream(
                    stream,
                    `W: Failed to clean download caches for extension: ${id}\n`
                );
            }
        } catch (error) {
            this.application.logger.error(error);

            await this.writeStream(stream, this.downloadProgressStreamEOF);
            await this.writeStream(stream, "\n");
            await this.writeStream(stream, `E: Failed to retrieve extension: ${id}\n`);
        }
    }

    private async installExtension(filePath: string, extension: ExtensionInfo, stream?: Response) {
        if (!this.extensionsPath) {
            return;
        }

        await this.writeStream(
            stream,
            `Preparing to unpack ${extension.name} (${extension.version})...\n`
        );
        const extensionTmpDirectory = systemPrefix(
            `tmp/${extension.id}-${extension.version}`,
            true
        );
        await this.writeStream(stream, `Unpacking ${extension.name} (${extension.version})...\n`);

        try {
            await tar.x({
                file: filePath,
                cwd: extensionTmpDirectory
            });
        } catch (error) {
            this.application.logger.error(error);
            await this.writeStream(stream, `E: Unable to unpack extension: ${extension.id}\n`);
            return;
        }

        await this.writeStream(stream, `Setting up ${extension.name} (${extension.version})...\n`);
        const extensionDirectory = path.join(this.extensionsPath, extension.shortName);

        try {
            await fs.rename(
                path.join(extensionTmpDirectory, `${extension.shortName}-${extension.version}`),
                extensionDirectory
            );
        } catch (error) {
            this.application.logger.error(error);
            await this.writeStream(stream, `E: Failed to set up extension: ${extension.id}\n`);
            return;
        }

        await this.writeStream(stream, "Cleaning up caches and temporary files...\n");

        try {
            await rm(extensionTmpDirectory, { force: true, recursive: true });
        } catch (error) {
            this.application.logger.error(error);
            await this.writeStream(
                stream,
                `W: Failed to clean up temporary files for extension: ${extension.id}\n`
            );
        }

        // TODO: Load extension automatically
    }
}
