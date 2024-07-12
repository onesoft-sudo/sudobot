import axios from "axios";
import { exec } from "child_process";
import { formatDistance } from "date-fns";
import decompress from "decompress";
import { createWriteStream, existsSync } from "fs";
import { mkdir, rename, rm } from "fs/promises";
import path from "path";
import * as tar from "tar";
import IO from "./IO";
import UsesWrapper from "./UsesWrapper";
import { NODE_DIR, NODE_INTERPRETER, TMPDIR } from "./utils";

class SDKManager extends UsesWrapper {
    private findInPath(executable: string) {
        const PATH = process.env.PATH ?? "";
        const paths = PATH.split(process.platform === "win32" ? ";" : ":");

        for (const p of paths) {
            const fullPath = path.join(p, executable);

            if (existsSync(fullPath)) {
                return fullPath;
            }
        }

        return null;
    }

    private getExecutionOutput(executable: string, ...args: string[]) {
        return new Promise<string>((resolve, reject) => {
            const stringArgs = args
                .map(arg => {
                    if (arg.includes('"') && arg.includes("'")) {
                        reject(
                            new Error(
                                "Cannot have both unescaped single and double quotes in an argument"
                            )
                        );
                        return;
                    }

                    if (arg.includes('"')) {
                        return `'${arg}'`;
                    }

                    return `"${arg}"`;
                })
                .join(" ");

            if (stringArgs.includes(undefined as never)) {
                return;
            }

            exec(`"${executable}" ${stringArgs}`, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Failed to get node version: ${stderr}`, { cause: error }));
                    return;
                }

                resolve(stdout.trim().slice(1));
            });
        });
    }

    public async checkNode() {
        const nodePath = this.findInPath(process.platform === "win32" ? "node.exe" : "node");
        const expectedNodeVersion = this.wrapper.properties.get("node.version", "21.0.0");

        if (nodePath) {
            IO.debug(`Found Node.js at: ${nodePath}`);
            const version = await this.getExecutionOutput(nodePath, "--version");

            if (version !== expectedNodeVersion) {
                IO.warn(
                    `Node.js version mismatch: required ${expectedNodeVersion}, found ${version}`
                );
                await this.installNode(expectedNodeVersion);
            } else {
                IO.debug(`Node.js version: ${version}`);
            }
        } else {
            await this.installNode(expectedNodeVersion);
        }
    }

    public async installNode(version: string) {
        if (existsSync(NODE_DIR)) {
            await rm(NODE_DIR, { recursive: true });
        }

        const destination = path.join(TMPDIR, `node-v${version}.tar.gz`);

        if (existsSync(destination)) {
            IO.info(`Node.js version ${version} was already downloaded (resolved from cache)`);
        } else {
            const file = this.getNodeDownloadURL(version);
            IO.info(`Starting download of Node.js version: ${version} (${file})`);
            await this.downloadFile(file, destination, `Downloading Node.js v${version}`);
        }

        await this.extractNode(version, destination);
        IO.info("Unpacked and installed Node.js to: ", NODE_DIR);

        const currentVersion = await this.getExecutionOutput(NODE_INTERPRETER, "--version");
        IO.info(`Node.js version: ${currentVersion}`);
    }

    private async extractNode(version: string, file: string) {
        const nodeDirName = this.getNodeDistDirName(version);
        IO.debug(`Extracting Node.js to: ${TMPDIR}/node-tmp`);
        const destination = path.join(TMPDIR, "node-tmp");

        if (existsSync(destination)) {
            IO.debug(`Removing existing node directory: ${destination}`);
            await rm(destination, { recursive: true });
        }

        await mkdir(destination);

        try {
            if (file.endsWith(".zip") || process.platform === "win32") {
                await decompress(file, destination);
            } else if (file.endsWith(".tar.gz")) {
                await tar.extract({
                    file,
                    C: destination,
                    z: true
                });
            } else {
                throw new Error(`Unsupported archive format: ${file}`);
            }
        } catch (error) {
            IO.fatal(`Failed to extract Node.js archive`, error);
        }

        const nodeDir = path.join(destination, nodeDirName);
        const nodeInstallDir = NODE_DIR;

        if (existsSync(nodeInstallDir)) {
            await rm(nodeInstallDir, { recursive: true });
        }

        await rename(nodeDir, nodeInstallDir);
    }

    private getNodeDistDirName(version: string) {
        return `node-v${version}-${
            process.platform === "win32"
                ? "win"
                : process.platform === "darwin"
                  ? "darwin"
                  : "linux"
        }-${this.transformArch(process.arch)}`;
    }

    private getNodeDownloadURL(version: string) {
        return `https://nodejs.org/dist/v${version}/${this.getNodeDistDirName(version)}.${process.platform === "win32" ? "zip" : "tar.gz"}`;
    }

    private transformArch(arch: typeof process.arch) {
        if (["x64", "arm64"].includes(arch)) {
            return arch;
        }

        if (arch === "ia32") {
            return "x86";
        } else if (arch === "arm") {
            return "armv7l";
        } else if (arch === "ppc64") {
            return "ppc64le";
        } else if (arch === "s390") {
            return "s390x";
        } else {
            throw new Error(`Unsupported architecture: ${arch}`);
        }
    }

    public async install() {
        await this.checkNode();
    }

    private async downloadFile(url: string, destination: string, status?: string) {
        if (existsSync(destination)) {
            await rm(destination);
        }

        const file = createWriteStream(destination);

        return new Promise<void>((resolve, reject) => {
            const startTime = Date.now();
            axios
                .get(url, {
                    responseType: "stream",
                    onDownloadProgress(progressEvent) {
                        const percent = !progressEvent.total
                            ? "N/A"
                            : Math.round((progressEvent.loaded / progressEvent.total) * 100) + "%";
                        const rateOfDownload = (Date.now() - startTime) / progressEvent.loaded;
                        const eta = !progressEvent.total
                            ? null
                            : (progressEvent.total - progressEvent.loaded) * rateOfDownload;
                        const cols = process.stdout.columns ?? 0;

                        process.stdout.write(
                            (
                                `\r${status ? `${status} | ` : ""}Downloading: ${percent}` +
                                (eta === null || eta >= 1
                                    ? ` | ETA: ${eta === null ? "N/A" : formatDistance(Date.now() + eta, Date.now(), { addSuffix: true, includeSeconds: true })}`
                                    : "")
                            ).padEnd(cols, " ")
                        );

                        if (percent === "100%") {
                            process.stdout.write("\r\n");
                        }
                    }
                })
                .then(response => {
                    response.data.pipe(file);

                    file.on("finish", () => {
                        file.close();
                        resolve();
                    });

                    file.on("error", error => {
                        file.close();
                        reject(error);
                    });
                })
                .catch(reject);
        });
    }
}

export default SDKManager;
