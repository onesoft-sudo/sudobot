import { File, FileResolvable } from "../io/File";
import IO from "../io/IO";
import { Manager } from "./Manager";

type Cache = {
    data: Record<
        string,
        {
            input: Record<string, number | null>;
            output: Record<string, number | null>;
        }
    >;
    tasksRan: string[];
};

export class FileSystemManager extends Manager {
    private _cache: Cache = {
        data: {},
        tasksRan: []
    };

    public async readCacheFile() {
        const cacheFile = File.of(".blaze/files.json");

        if (cacheFile.exists) {
            const cache = await cacheFile.readJson<typeof this._cache>();
            this._cache = cache;
        }
    }

    public async writeFileCache() {
        const cacheFile = File.of(".blaze/files.json");
        await cacheFile.writeJson(this._cache);
    }

    public cacheFile(taskName: string, file: File, io: "input" | "output" = "input") {
        if (!this._cache.data[taskName]) {
            this._cache.data[taskName] = {
                input: {},
                output: {}
            };
        }

        this._cache.data[taskName][io][file.path] = file.exists ? file.lastModified : null;
    }

    public isUpToDate(
        taskName: string,
        resolvable: FileResolvable,
        io: "input" | "output" = "input"
    ) {
        const file = File.of(resolvable);
        const path = file.realpath;

        if (!this._cache.data[taskName]?.[io]?.[path]) {
            return false;
        }

        const lastModified = this._cache.data[taskName]?.[io]?.[path];

        return (
            ((lastModified === null || !file.exists) && lastModified === null && !file.exists) ||
            (!!lastModified && lastModified >= file.lastModified)
        );
    }

    public isTaskUpToDate(name: string, io: "input" | "output" | "both" = "output") {
        const includes = this._cache.tasksRan.includes(name);

        if (!includes) {
            return false;
        }

        if (!this._cache.data[name]) {
            return false;
        }

        if (io !== "input") {
            for (const path in this._cache.data[name]?.output) {
                const file = File.of(path);

                const lastModified = this._cache.data[name]?.output?.[path];

                IO.debug(`[OUTPUT] ${file.path}`);
                IO.debug(
                    `[OUTPUT] ${!file.exists || !lastModified || lastModified < file.lastModified}`
                );

                if (!file.exists || !lastModified || lastModified < file.lastModified) {
                    return false;
                }
            }
        }

        if (io !== "output") {
            for (const path in this._cache.data[name]?.input) {
                const file = File.of(path);

                const lastModified = this._cache.data[name]?.input?.[path];

                IO.debug(`[INPUT] ${file.path}`);
                IO.debug(
                    `[INPUT] ${!file.exists || !lastModified || lastModified < file.lastModified}`
                );

                if (!file.exists || !lastModified || lastModified < file.lastModified) {
                    return false;
                }
            }
        }

        return true;
    }

    public markAsRan(name: string) {
        if (this._cache.tasksRan.includes(name)) {
            return;
        }

        return this._cache.tasksRan.push(name);
    }

    public addFiles(task: string, io: "input" | "output" = "input", ...files: FileResolvable[]) {
        for (const file of files) {
            this.cacheFile(task, File.of(file), io);
        }
    }

    public clearFiles(task: string) {
        if (!this._cache.data[task]) {
            return;
        }

        this._cache.data[task].input = {};
        this._cache.data[task].output = {};
    }
}
