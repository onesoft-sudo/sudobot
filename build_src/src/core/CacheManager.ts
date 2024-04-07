import { readFile, rm, writeFile } from "fs/promises";
import BlazeBuild from "./BlazeBuild";
import { Manager } from "./Manager";

export class CacheManager extends Manager {
    private _cache: Map<string, unknown> = new Map();
    private _removed = false;
    private _nocache = false;

    public get<T>(key: string): T | undefined {
        return this._cache.get(key) as T | undefined;
    }

    public set<T>(key: string, value: T) {
        this._cache.set(key, value);
    }

    public delete(key: string) {
        this._cache.delete(key);
    }

    public clear() {
        this._cache.clear();
    }

    public async write(force = false) {
        if (this._removed && !force) {
            return;
        }

        this._nocache = false;
        await writeFile(BlazeBuild.buildInfoDir("cache.json"), JSON.stringify([...this._cache]));
    }

    public async read() {
        try {
            const data = await readFile(BlazeBuild.buildInfoDir("cache.json"), {
                encoding: "utf-8"
            });
            this._cache = new Map(JSON.parse(data));
        } catch {
            this._cache = new Map();
            this._nocache = true;
        }
    }

    public async setAndWrite<T>(key: string, value: T) {
        this.set(key, value);
        await this.write();
    }

    public async rmFile() {
        await rm(BlazeBuild.buildInfoDir("cache.json"), {
            force: true
        });

        this._removed = true;
        this._nocache = true;
    }

    public noCacheFileFound() {
        return this._nocache;
    }
}
