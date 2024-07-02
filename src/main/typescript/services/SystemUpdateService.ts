import { Name } from "@framework/services/Name";
import { Service } from "@framework/services/Service";
import { getAxiosClient } from "@main/utils/axios";
import { systemPrefix } from "@main/utils/utils";
import { AxiosResponse } from "axios";
import { createWriteStream, existsSync } from "fs";
import { mkdir, rename, rm } from "fs/promises";
import path from "path";
import semver from "semver";
import tar from "tar";

type GitHubReleaseAsset = {
    name: string;
    browser_download_url: string;
};

type GitHubReleaseResponse = {
    tag_name: string;
    assets: GitHubReleaseAsset[];
    body: string;
};

@Name("systemUpdateService")
class SystemUpdateService extends Service {
    public static readonly latestReleaseURL: string =
        "https://api.github.com/repos/onesoft-sudo/sudobot/releases/latest";
    public static readonly filesToBackup = ["src", "build", "package.json"];

    public async checkForUpdate(): Promise<GitHubReleaseResponse | null> {
        const response: AxiosResponse<GitHubReleaseResponse> =
            await getAxiosClient().get<GitHubReleaseResponse>(SystemUpdateService.latestReleaseURL);

        const latestVersion = response.data.tag_name.startsWith("v")
            ? response.data.tag_name.substring(1)
            : response.data.tag_name;

        if (semver.valid(latestVersion) === null) {
            throw new Error("Invalid version string");
        }

        if (semver.gt(latestVersion, this.application.version)) {
            return response.data;
        }

        return null;
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

        for (const file of SystemUpdateService.filesToBackup) {
            const filePath = path.join(__dirname, "../../../../", file);

            if (!existsSync(filePath)) {
                continue;
            }

            await rename(filePath, path.join(backupPath, file));
        }
    }

    public async applyUpdate(): Promise<void> {
        const updatePath = systemPrefix("tmp/update");

        for (const file of SystemUpdateService.filesToBackup) {
            const filePath = path.resolve(updatePath, "sudobot", file);
            const systemFilePath = path.join(__dirname, "../../../../", file);

            if (!existsSync(filePath) || existsSync(systemFilePath)) {
                continue;
            }

            await rename(filePath, systemFilePath);
        }
    }

    public async cleanUp(): Promise<void> {
        const tmpPath = systemPrefix("tmp");
        const updateDirectory = path.join(tmpPath, "update");
        const updateTarGz = path.join(tmpPath, "update.tar.gz");

        if (existsSync(updateDirectory)) {
            await rm(updateDirectory, { recursive: true });
        }

        if (existsSync(updateTarGz)) {
            await rm(updateTarGz);
        }
    }

    public async update() {
        try {
            this.application.logger.debug("Checking for updates...");
            const release = await this.checkForUpdate();

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
            await this.downloadUpdate(release.assets[0]);

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
            return;
        }

        await this.application.service("startupManager").requestRestart();
    }
}

export default SystemUpdateService;
