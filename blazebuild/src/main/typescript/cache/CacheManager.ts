import Manager from "../core/Manager";
import IO from "../io/IO";

// FIXME: This is a hack
const CACHE_FILE = `${process.cwd()}/.blaze/cache.json`;
export const DEFAULT_MODULE = "main";

type CacheJson = {
    [module: string]:
        | {
              buildFileModTime: number;
              tasks: {
                  [task: string]: {
                      input: {
                          [path: string]: number | null | undefined;
                      };
                      output: {
                          [path: string]: number | null | undefined;
                      };
                  };
              };
          }
        | undefined;
};

class CacheManager extends Manager {
    protected _cache?: CacheJson;

    public override async boot() {
        await this.loadCache();
    }

    public async loadCache() {
        if (this._cache !== undefined) {
            throw new Error("Cache already loaded!");
        }

        const file = Bun.file(CACHE_FILE);

        if (!(await file.exists())) {
            this._cache = {};
        } else {
            try {
                this._cache = await file.json();
            } catch (error) {
                IO.debug("Failed to load cache: " + (error as Error).message);
                this._cache = {};
            }
        }
    }

    public get cache() {
        if (!this._cache) {
            throw new Error("Cache not loaded!");
        }

        return this._cache;
    }

    public updateBuildFileModTime() {
        if (!this._cache![DEFAULT_MODULE]) {
            this._cache![DEFAULT_MODULE] = {
                buildFileModTime: this.blaze.buildScriptManager.buildScriptLastModTime,
                tasks: {}
            };
        } else {
            this._cache![DEFAULT_MODULE].buildFileModTime =
                this.blaze.buildScriptManager.buildScriptLastModTime;
        }
    }

    public async saveCache() {
        this.updateBuildFileModTime();
        await Bun.write(CACHE_FILE, JSON.stringify(this._cache, null, 4), {
            mode: 0o600
        });
    }

    public getCachedLastModTime(
        module: string,
        task: string,
        type: "input" | "output",
        path: string
    ): number | null | undefined {
        if (!this._cache) {
            throw new Error("Cache not loaded!");
        }

        return this._cache[module]?.tasks[task]?.[type][path];
    }

    public getCachedFiles(
        module: string,
        task: string,
        type: "input" | "output"
    ): Record<string, number | null | undefined> | null {
        if (!this._cache) {
            throw new Error("Cache not loaded!");
        }

        const caches = this._cache[module]?.tasks[task]?.[type];

        if (caches === null || caches === undefined) {
            return null;
        }

        return caches;
    }

    public setCachedLastModTime(
        module: string,
        task: string,
        type: "input" | "output",
        path: string,
        lastModTime: number | null | undefined
    ) {
        if (!this._cache) {
            throw new Error("Cache not loaded!");
        }

        if (!this._cache[module]) {
            this._cache[module] = {
                tasks: {},
                buildFileModTime: this.blaze.buildScriptManager.buildScriptLastModTime
            };
        }

        if (!this._cache[module]?.tasks[task]) {
            this._cache[module]!.tasks[task] = {
                input: {},
                output: {}
            };
        }

        this._cache[module]!.tasks[task]![type][path] = lastModTime;
    }
}

export default CacheManager;
