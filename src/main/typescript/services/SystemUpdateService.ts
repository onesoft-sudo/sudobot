/*
* This file is part of SudoBot.
*
* Copyright (C) 2021-2024 OSN Developers.
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

import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { getAxiosClient } from "@main/utils/axios";
import { systemPrefix } from "@main/utils/utils";
import { AxiosResponse } from "axios";
import { createWriteStream, existsSync } from "fs";
import { mkdir, rename, rm } from "fs/promises";
import path from "path";
import semver from "semver";
import * as tar from "tar";

type GitHubReleaseAsset = {
    name: string;
    browser_download_url: string;
};

type GitHubReleaseResponse = {
    tag_name: string;
    assets: GitHubReleaseAsset[];
    body: string;
    created_at: string;
};

@Name("systemUpdateService")
class SystemUpdateService extends Service {
    public static readonly releasesURL: string =
        "https://api.github.com/repos/onesoft-sudo/sudobot/releases";
    public static readonly filesToReplace = ["src", "build", "package.json"];

    public async checkForUpdate() {
        const response: AxiosResponse<GitHubReleaseResponse[]> = await getAxiosClient().get<
            GitHubReleaseResponse[]
        >(SystemUpdateService.releasesURL);

        const updateInfo = {
            latestStable: null as GitHubReleaseResponse | null,
            latestUnstable: null as GitHubReleaseResponse | null
        };

        const latestStable = response.data.find(release =>
            /^v?[1-9]\d*\.\d+\.\d+$/.test(release.tag_name)
        );
        const latestUnstable = response.data.find(
            release => !/^v?[1-9]\d*\.\d+\.\d+$/.test(release.tag_name)
        );

        const latestStableVersion = latestStable?.tag_name.startsWith("v")
            ? latestStable?.tag_name.substring(1)
            : latestStable?.tag_name;

        const latestUnstableVersion = latestUnstable?.tag_name.startsWith("v")
            ? latestUnstable?.tag_name.substring(1)
            : latestUnstable?.tag_name;

        if (!latestStableVersion || semver.valid(latestStableVersion) === null) {
            throw new Error("Invalid stable version string");
        }
        if (!latestUnstableVersion || semver.valid(latestUnstableVersion) === null) {
            throw new Error("Invalid unstable version string");
        }

        if (semver.gt(latestStableVersion, this.application.version)) {
            updateInfo.latestStable = latestStable ?? null;
        }

        if (semver.gt(latestUnstableVersion, this.application.version)) {
            updateInfo.latestUnstable = latestUnstable ?? null;
        }

        return updateInfo;
    }

    public canAutoUpdate(release: GitHubReleaseResponse) {
        return !release.body.includes("[NAE]");
    }

    public async downloadUpdate(update: GitHubReleaseAsset): Promise<void> {
        const response: AxiosResponse = await getAxiosClient().get(update.browser_download_url, {
            responseType: "stream"
        });

        const writeStream = createWriteStream(
            path.join(systemPrefix("tmp", true), "update.tar.gz")
        );
        response.data.pipe(writeStream);

        return new Promise((resolve, reject) => {
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
        });
    }

    public async unpackUpdate(): Promise<void> {
        await tar.extract({
            file: path.join(systemPrefix("tmp"), "update.tar.gz"),
            cwd: systemPrefix("tmp/update", true)
        });
    }

    public async backupCurrentVersion(): Promise<void> {
        const backupPath = systemPrefix("tmp/backup");

        if (existsSync(backupPath)) {
            await rm(backupPath, { recursive: true });
        }

        await mkdir(backupPath, { recursive: true });

        for (const file of SystemUpdateService.filesToReplace) {
            const filePath = path.join(__dirname, "../../../../", file);

            if (!existsSync(filePath)) {
                continue;
            }

            await rename(filePath, path.join(backupPath, file));
        }
    }

    public async applyUpdate(): Promise<void> {
        const updatePath = systemPrefix("tmp/update");

        for (const file of SystemUpdateService.filesToReplace) {
            const filePath = path.resolve(
                updatePath,
                `sudobot-release-${process.platform === "darwin" ? "darwin" : "linux"}`,
                file
            );
            const systemFilePath = path.join(__dirname, "../../../../", file);

            if (!existsSync(filePath) || existsSync(systemFilePath)) {
                continue;
            }

            await rename(filePath, systemFilePath);
        }
    }

    public async cleanUp(): Promise<void> {
        const tmpPath = systemPrefix("tmp");
        const backupPath = systemPrefix("tmp/backup");
        const newBackupPath = systemPrefix("tmp/backup-" + Date.now());
        const updateDirectory = path.join(tmpPath, "update");
        const updateTarGz = path.join(tmpPath, "update.tar.gz");

        if (existsSync(updateDirectory)) {
            await rm(updateDirectory, { recursive: true });
        }

        if (existsSync(updateTarGz)) {
            await rm(updateTarGz);
        }

        if (existsSync(backupPath)) {
            await rename(backupPath, newBackupPath);
        }
    }

    public async restoreBackup() {
        const backupPath = systemPrefix("tmp/backup");

        if (!existsSync(backupPath)) {
            this.application.logger.error("No backup found to restore.");
            return;
        }

        for (const file of SystemUpdateService.filesToReplace) {
            const backupFilePath = path.join(backupPath, file);
            const systemFilePath = path.join(__dirname, "../../../../", file);

            if (!existsSync(backupFilePath)) {
                continue;
            }

            await rename(backupFilePath, systemFilePath);
        }
    }

    public async update(release: GitHubReleaseResponse | null = null, restart = true) {
        try {
            this.application.logger.debug("Checking for updates...");

            if (!release) {
                release = (await this.checkForUpdate()).latestStable;
            }

            if (release === null) {
                this.application.logger.info("No updates available.");
                return;
            }

            if (!this.canAutoUpdate(release)) {
                this.application.logger.info(
                    "Cannot auto-update to this release. Please update manually."
                );
                return;
            }

            this.application.logger.info(`Downloading update version ${release.tag_name}.`);
            await this.downloadUpdate(
                release.assets.find(a =>
                    a.name.includes(process.platform === "darwin" ? "darwin" : "linux")
                ) ?? release.assets[0]
            );

            this.application.logger.info("Unpacking update...");
            await this.unpackUpdate();

            this.application.logger.info("Backing up current version...");
            await this.backupCurrentVersion();

            this.application.logger.info("Applying update...");
            await this.applyUpdate();

            this.application.logger.info("Cleaning up...");
            await this.cleanUp();

            this.application.logger.info("System has been updated successfully.");
            this.application.logger.info("Requesting a restart.");
        } catch (error) {
            this.application.logger.error("An error has occurred while updating the system.");
            this.application.logger.error(error);
            await this.restoreBackup();
            return false;
        }

        if (restart) {
            await this.application.service("startupManager").requestRestart({ metadata: "update" });
        }

        return true;
    }
}

export default SystemUpdateService;
