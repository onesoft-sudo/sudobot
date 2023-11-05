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

import axios from "axios";
import { spawnSync } from "child_process";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Colors,
    ComponentType,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder
} from "discord.js";
import { existsSync } from "fs";
import { cp, mkdir, rename, rm } from "fs/promises";
import path, { basename, join } from "path";
import semver from "semver";
import Command, { AnyCommandContext, CommandMessage, CommandReturn, ValidationRule } from "../../core/Command";
import { downloadFile } from "../../utils/download";
import { log, logError, logInfo, logWarn } from "../../utils/logger";
import { developmentMode, sudoPrefix } from "../../utils/utils";

export default class UpdateCommand extends Command {
    public readonly name = "update";
    public readonly validationRules: ValidationRule[] = [];
    public readonly permissions = [];
    public readonly description = "Updates the bot to the latest version.";
    public readonly systemAdminOnly = true;
    protected readonly RELEASE_API_URL = "https://api.github.com/repos/onesoft-sudo/sudobot/releases/latest";
    protected readonly UNSTABLE_DOWNLOAD_URL = "https://github.com/onesoft-sudo/sudobot/archive/refs/heads/main.zip";
    public updateChannel?: "stable" | "unstable";
    public readonly beta = true;

    async execute(message: CommandMessage, context: AnyCommandContext): Promise<CommandReturn> {
        const unsatisfiedRequirement = this.checkRequirements();

        if (unsatisfiedRequirement) {
            await this.error(
                message,
                `The \`${unsatisfiedRequirement}\` program is not installed in the current system. Please install it if you want to use this command.`
            );
            return;
        }

        await this.deferIfInteraction(message);

        try {
            const response = await axios.get(this.RELEASE_API_URL);
            const tagName = response.data?.tag_name;
            const version = tagName.replace(/^v/, "");
            const stableDownloadURL = `https://github.com/onesoft-sudo/sudobot/archive/refs/tags/${tagName}.zip`;
            const updateAvailable = semver.gt(version, this.client.metadata.data.version);
            this.updateChannel = updateAvailable ? "stable" : "unstable";

            await this.deferredReply(message, {
                embeds: [
                    {
                        author: {
                            name: "System Update",
                            icon_url: this.client.user?.displayAvatarURL() ?? undefined
                        },
                        description:
                            "Are you sure you want to continue? This will download an update, install it, push schema changes to the database, and then restart the bot system. Make sure you have a backup in case if a data loss occurs.",
                        color: 0x007bff
                    }
                ],
                components: this.actionRow({ updateAvailable, version })
            });

            const updateChannelCollector = message.channel!.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                filter: (interaction: StringSelectMenuInteraction) => {
                    if (interaction.user.id === message.member!.user.id && interaction.customId === "system_update_channel") {
                        return true;
                    }

                    interaction
                        .reply({
                            ephemeral: true,
                            content: `That's not under your control.`
                        })
                        .catch(logError);

                    return false;
                },
                time: 120_000
            });

            const confirmationCollector = message.channel!.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: (interaction: ButtonInteraction) => {
                    if (interaction.user.id === message.member!.user.id && interaction.customId.startsWith(`system_update__`)) {
                        return true;
                    }

                    interaction
                        .reply({
                            ephemeral: true,
                            content: `That's not under your control.`
                        })
                        .catch(logError);

                    return false;
                },
                time: 120_000
            });

            confirmationCollector.on("collect", async interaction => {
                if (!interaction.isButton()) {
                    return;
                }

                if (interaction.customId === "system_update__cancel") {
                    confirmationCollector.stop();
                    updateChannelCollector.stop();

                    await interaction.update({
                        embeds: [
                            {
                                author: {
                                    name: "System Update",
                                    icon_url: this.client.user?.displayAvatarURL() ?? undefined
                                },
                                description: "Update cancelled.",
                                color: 0xf14a60
                            }
                        ],
                        components: this.actionRow({ updateAvailable, version, disabled: true })
                    });

                    return;
                }

                if (!this.updateChannel) {
                    await interaction.reply({
                        content: "Please select an update channel first!"
                    });

                    return;
                }

                await interaction.update({
                    embeds: [
                        {
                            author: {
                                name: "System Update",
                                icon_url: this.client.user?.displayAvatarURL() ?? undefined
                            },
                            description: `${this.emoji("loading")} Update in progress...`,
                            color: 0x007bff
                        }
                    ],
                    components: this.actionRow({ updateAvailable, version, disabled: true })
                });

                let success = false;

                try {
                    success = await this.update({
                        stableDownloadURL,
                        version
                    });
                } catch (e) {}

                await interaction.message.edit({
                    embeds: [
                        {
                            author: {
                                name: "System Update",
                                icon_url: this.client.user?.displayAvatarURL() ?? undefined
                            },
                            description: success
                                ? `${this.emoji("check")} Successfully installed the update. Restarting now.`
                                : `${this.emoji("error")} An error has occurred while performing the update.`,
                            color: Colors.Green
                        }
                    ]
                });

                process.exit(this.client.configManager.systemConfig.restart_exit_code);
            });

            updateChannelCollector.on("collect", async interaction => {
                if (!interaction.isStringSelectMenu()) {
                    return;
                }

                const updateChannel = interaction.component.options[0].value;

                if (!["stable", "unstable"].includes(updateChannel)) {
                    return;
                }

                this.updateChannel = updateChannel as (typeof this)["updateChannel"];
                await interaction.deferUpdate();
            });
        } catch (e) {
            logError(e);
            await this.error(message, "An unknown error has occurred while trying to fetch information about the updates.");
        }
    }

    actionRow({ version, updateAvailable, disabled = false }: { version: string; updateAvailable: boolean; disabled?: boolean }) {
        return [
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .addOptions(
                        new StringSelectMenuOptionBuilder({
                            label: "Latest Stable",
                            description: `${version} • ${updateAvailable ? "Update available" : "Up to date"}`,
                            value: "stable",
                            default: updateAvailable
                        }).setEmoji("⚙"),
                        new StringSelectMenuOptionBuilder({
                            label: "Latest Unstable",
                            description: `main • Unstable versions may break things unexpectedly`,
                            value: "unstable",
                            default: !updateAvailable
                        }).setEmoji("⚒️")
                    )
                    .setCustomId("system_update_channel")
                    .setMaxValues(1)
                    .setMinValues(1)
                    .setPlaceholder("Select an update channel")
                    .setDisabled(disabled)
            ),
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId("system_update__cancel")
                    .setLabel("Cancel")
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId("system_update__continue")
                    .setLabel("Continue")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled)
            )
        ];
    }

    downloadUpdate({ stableDownloadURL, version }: { stableDownloadURL: string; version: string }): Promise<{
        filePath?: string;
        storagePath?: string;
        error?: Error;
    }> {
        const url = this.updateChannel === "stable" ? stableDownloadURL : this.UNSTABLE_DOWNLOAD_URL;
        const tmpdir = sudoPrefix("tmp", true);
        const dirname = `update-${this.updateChannel === "stable" ? version : "unstable"}`;

        try {
            return downloadFile({
                url,
                path: tmpdir,
                name: `${dirname}.zip`
            });
        } catch (error) {
            logError(error);
            logError("Failed to download the update package. Aborting");
            return Promise.resolve({ error: error as Error });
        }
    }

    checkRequirements() {
        const paths = process.env.PATH?.split(process.platform === "win32" ? ";" : ":") ?? [];

        for (const path of paths) {
            if (process.platform === "win32" && join(path, "powershell.exe")) {
                return null;
            }

            if (join(path, "unzip")) {
                return null;
            }
        }

        return process.platform === "win32" ? "powershell.exe" : "unzip";
    }

    async unpackUpdate({ filePath, storagePath, version }: { version: string; filePath: string; storagePath: string }) {
        const dirname = `update-${this.updateChannel === "stable" ? version : "unstable"}`;
        const unpackedDirectory = join(storagePath!, dirname);

        try {
            const cwd = process.cwd();

            if (existsSync(unpackedDirectory)) {
                await rm(unpackedDirectory, { recursive: true });
            }

            await mkdir(unpackedDirectory);
            process.chdir(unpackedDirectory);

            const { status, error } = spawnSync(
                process.platform === "win32"
                    ? `powershell -command "Expand-Archive -Force '${filePath}' '${unpackedDirectory}'"`
                    : `unzip ../${basename(filePath)}`,
                {
                    shell: true,
                    encoding: "utf-8",
                    stdio: "inherit",
                    cwd: unpackedDirectory
                }
            );

            if (status !== 0 || error) {
                throw error;
            }

            process.chdir(cwd);
            return { unpackedDirectory };
        } catch (error) {
            logError(error);
            logError("Failed to unpack the update package. Aborting.");
            return { error };
        }
    }

    private createDirectoryBackupPair(name: string) {
        return [path.join(__dirname, "../../../", name), path.join(__dirname, `../../../.backup/${name}`)] as const;
    }

    async installUpdate({ unpackedDirectory, version }: { unpackedDirectory: string; version: string }) {
        const { error, dirpairs } = await this.backupCurrentSystem(["build", "src", "prisma", "scripts"]);

        if (error) {
            return false;
        }

        const installFiles = ["src", "prisma", "scripts", "package.json", "tsconfig.json"];

        try {
            for (const installFile of installFiles) {
                const src = path.join(
                    unpackedDirectory,
                    `sudobot-${this.updateChannel === "stable" ? version : "main"}`,
                    installFile
                );
                const dest = path.join(__dirname, "../../../", installFile);

                log(`Installing ${src} to ${dest}`);

                await rm(dest, {
                    recursive: true
                });

                await cp(src, dest, {
                    recursive: true
                });
            }
        } catch (error) {
            logError(error);
            logError("Failed to install the update package. Attempting to rollback the changes");
            await this.rollbackUpdate(dirpairs!);
            return false;
        }

        return await this.buildNewInstallation(dirpairs!);
    }

    async backupCurrentSystem(dirsToBackup: string[]) {
        const dirpairs = dirsToBackup.map(dir => this.createDirectoryBackupPair(dir));

        try {
            await this.createBackupDirectoryIfNeeded();

            for (const [src, dest] of dirpairs) {
                log(`Copying ${src} to ${dest}`);

                await cp(src, dest, {
                    recursive: true
                });
            }
        } catch (error) {
            logError(error);
            logError("Failed to backup the current bot system. Attempting to revert changes");
            await this.rollbackUpdate(dirpairs);
            return { error };
        }

        return { dirpairs };
    }

    async createBackupDirectoryIfNeeded() {
        const backupDir = path.join(__dirname, `../../../.backup`);

        if (!existsSync(backupDir)) {
            await mkdir(backupDir);
        }

        return backupDir;
    }

    async rollbackUpdate(dirpairs: Array<readonly [string, string]>) {
        try {
            const backupDir = await this.createBackupDirectoryIfNeeded();

            for (const [src, dest] of dirpairs) {
                if (!existsSync(dest)) {
                    log(`No backup found for ${src}`);
                    continue;
                }

                log(`Restoring ${src} from ${dest}`);

                if (existsSync(src)) {
                    log(`Saving current state of ${src}`);
                    await rename(src, path.join(backupDir, `${basename(src)}.current`)).catch(log);
                }

                await rename(dest, src);
            }

            logInfo("Rolled back the update successfully");
        } catch (error) {
            logError(error);
            logError("Error rolling back the update");
            return false;
        }

        return true;
    }

    async cleanup({ unpackedDirectory, downloadedFile }: { unpackedDirectory: string; downloadedFile: string }) {
        await rm(unpackedDirectory, { recursive: true });
        await rm(downloadedFile);
    }

    buildNewInstallation(dirpairs: Array<readonly [string, string]>) {
        const { status: buildStatus } = spawnSync(`npm run build`, {
            stdio: "inherit",
            cwd: path.join(__dirname, "../../.."),
            encoding: "utf-8",
            shell: true
        });

        if (buildStatus !== 0) {
            logError("Failed to build the update. Rolling back");
            return this.rollbackUpdate(dirpairs);
        }

        const { status: dbPushStatus } = spawnSync(`npx prisma db push`, {
            stdio: "inherit",
            cwd: path.join(__dirname, "../../.."),
            encoding: "utf-8",
            shell: true
        });

        if (dbPushStatus !== 0) {
            logError("Failed to push database schema changes. Rolling back");
            return this.rollbackUpdate(dirpairs);
        }

        const { status: slashCommandStatus } = spawnSync(`npm run deploy${developmentMode() ? " -- --guild" : ""}`, {
            stdio: "inherit",
            cwd: path.join(__dirname, "../../.."),
            encoding: "utf-8",
            shell: true
        });

        if (slashCommandStatus !== 0) {
            logWarn("Failed to update application commands. Please manually update them.");
        }

        return true;
    }

    async update({ stableDownloadURL, version }: { stableDownloadURL: string; version: string }) {
        const updateChannel = this.updateChannel;

        if (!updateChannel) {
            return false;
        }

        const { error: downloadError, filePath, storagePath } = await this.downloadUpdate({ stableDownloadURL, version });

        if (downloadError) {
            return false;
        }

        const { error: unpackError, unpackedDirectory } = await this.unpackUpdate({
            filePath: filePath!,
            storagePath: storagePath!,
            version
        });

        if (unpackError) {
            return false;
        }

        const successfullyInstalled = await this.installUpdate({ unpackedDirectory: unpackedDirectory!, version });

        if (!successfullyInstalled) {
            return false;
        }

        await this.cleanup({ unpackedDirectory: unpackedDirectory!, downloadedFile: filePath! }).catch(log);
        return true;
    }
}
