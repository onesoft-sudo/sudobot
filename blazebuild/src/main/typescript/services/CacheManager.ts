import { existsSync } from "fs";
import { lstat, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import Service from "../core/Service";

export type TaskCache = {
    taskArgs: string[];
    inputFiles: Record<string, number | null>;
    outputFiles: Record<string, number | null>;
};

class CacheManager extends Service {
    private readonly taskCache = new Map<string, TaskCache>();
    private readonly taskCacheFileName = "tasks.json";

    public setTaskCache(name: string, data: TaskCache): void {
        this.taskCache.set(name, data);
    }

    public getTaskCache(name: string): TaskCache | undefined {
        return this.taskCache.get(name);
    }

    public override async initialize(): Promise<void> {
        const metadataDirectory = this.blaze.settings.build.metadataDirectory;

        if (!existsSync(metadataDirectory)) {
            this.blaze.logger.debug(
                `Creating metadata directory: ${metadataDirectory}`
            );
            await mkdir(metadataDirectory, { recursive: true });
        }

        await this.reloadTaskCache();
    }

    public async reloadTaskCache(): Promise<void> {
        const taskCacheFilePath = path.join(
            this.blaze.settings.build.metadataDirectory,
            this.blaze.settings.build.metadataDirectoryUseNamespacing
                ? `${this.blaze.projectManager.project.name.replaceAll("/", "_")}_${this.taskCacheFileName}`
                : this.taskCacheFileName
        );

        if (existsSync(taskCacheFilePath)) {
            const mtime = (await lstat(taskCacheFilePath)).mtimeMs;

            this.taskCache.clear();

            if (
                this.blaze.settingsScriptLastModifiedTime > mtime ||
                this.blaze.buildScriptLastModifiedTime > mtime
            ) {
                return;
            }

            const data = JSON.parse(await readFile(taskCacheFilePath, "utf8"));

            for (const [name, cache] of Object.entries(data)) {
                this.taskCache.set(name, cache as TaskCache);
            }
        }
    }

    public async syncTaskCache() {
        const taskCacheFilePath = path.join(
            this.blaze.settings.build.metadataDirectory,
            this.blaze.settings.build.metadataDirectoryUseNamespacing
                ? `${this.blaze.projectManager.project.name.replaceAll("/", "_")}_${this.taskCacheFileName}`
                : this.taskCacheFileName
        );

        await writeFile(
            taskCacheFilePath,
            JSON.stringify(
                Object.fromEntries(this.taskCache.entries()),
                null,
                2
            ),
            "utf8"
        );
    }
}

export default CacheManager;
