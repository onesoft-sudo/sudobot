import { writeFileSync } from "node:fs";
import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Build } from "../core/Build.js";

export class CacheManager {
    private taskHashes = new Map<string, string>();
    private fileHashes = new Map<string, string>();

    public constructor(private readonly build: Build) {}

    public getTaskHash(taskName: string) {
        return this.taskHashes.get(taskName);
    }

    public getFileHash(fileName: string) {
        return this.fileHashes.get(fileName);
    }

    public setTaskHash(taskName: string, hash: string) {
        this.taskHashes.set(taskName, hash);
    }

    public setFileHash(fileName: string, hash: string) {
        this.fileHashes.set(fileName, hash);
    }

    public getCacheFilePath() {
        return path.join(this.build.projectManager.getCacheDirectoryPath(), "cache.json");
    }

    public async loadFromDisk() {
        const filepath = this.getCacheFilePath();

        try {
            const data = JSON.parse(await readFile(filepath, "utf-8"));

            this.taskHashes = new Map(data.taskHashes);
            this.fileHashes = new Map(data.fileHashes);
        } catch {}

        const script = this.build.projectManager.getBuildScriptPath();
        const scriptHash = await this.hashFile(script);

        if (scriptHash !== this.getFileHash(`b:${script}`)) {
            this.fileHashes = new Map();
            this.setFileHash(`b:${script}`, scriptHash);
        }
    }

    public async hashFile(file: string) {
        try {
            return (await lstat(file)).mtimeMs.toString();
        } catch {
            return "0";
        }
    }

    public async saveToDisk() {
        const filepath = this.getCacheFilePath();

        try {
            await writeFile(
                filepath,
                JSON.stringify(
                    {
                        taskHashes: [...this.taskHashes.entries()],
                        fileHashes: [...this.fileHashes.entries()]
                    },
                    null,
                    2
                )
            );
        } catch {}
    }

    public saveToDiskSync() {
        const filepath = this.getCacheFilePath();

        try {
            writeFileSync(
                filepath,
                JSON.stringify(
                    {
                        taskHashes: [...this.taskHashes.entries()],
                        fileHashes: [...this.fileHashes.entries()]
                    },
                    null,
                    2
                )
            );
        } catch {}
    }

    public clearIOFileHashes() {
        for (const key of this.fileHashes.keys()) {
            if (key.startsWith("i:") || key.startsWith("o:")) {
                this.fileHashes.delete(key);
            }
        }
    }
}
