import { Stats, existsSync, lstatSync, realpathSync } from "fs";
import { lstat, realpath } from "fs/promises";
import { basename, resolve } from "path";
import FileSystem from "../polyfills/FileSystem";

export type FileResolvable = string | File;

type Cache = {
    exists?: boolean;
    realpath?: string;
    basename?: string;
    stat?: Stats;
};

export class File {
    private cache: Cache = {};
    public readonly path: string;

    public constructor(path: string) {
        this.path = resolve(path);
    }

    public get exists(): boolean {
        return this.attribute("exists", () => existsSync(this.path));
    }

    public get name(): string {
        return this.attribute("basename", () => basename(this.path));
    }

    public get realpath(): string {
        return this.attribute("realpath", () => realpathSync(this.path));
    }

    public get lastModified(): number {
        return this.stat.mtimeMs;
    }

    public get size(): number {
        return this.stat.size;
    }

    public get stat(): Stats {
        return this.attribute("stat", () => lstatSync(this.path));
    }

    public readContents(): Promise<string> {
        return FileSystem.readFileContents(this.path);
    }

    public readJson<T>(): Promise<T> {
        return FileSystem.readFileContents(this.path, { json: true }) as Promise<T>;
    }

    public writeContents(contents: string): Promise<void> {
        return FileSystem.writeFileContents(this.path, contents);
    }

    public writeJson(contents: object): Promise<void> {
        return FileSystem.writeFileContents(this.path, contents, true);
    }

    private attribute<K extends keyof Cache>(
        name: K,
        compute: () => NonNullable<Cache[K]>
    ): NonNullable<Cache[K]> {
        if (!(name in this.cache)) {
            this.cache[name] = compute();
        }

        return this.cache[name] as NonNullable<Cache[K]>;
    }

    public clearCache(): this {
        this.cache = {};
        return this;
    }

    public static of(resolvable: FileResolvable): File {
        if (typeof resolvable === "string") {
            return new File(resolvable);
        }

        return resolvable.clearCache();
    }

    public async runStat() {
        const stat = await lstat(this.path);
        this.attribute("stat", () => stat);
        return this;
    }

    public async checkExists() {
        const exists = await FileSystem.exists(this.path);
        this.attribute("exists", () => exists);
        return this;
    }

    public async checkRealpath() {
        const path = await realpath(this.path);
        this.attribute("realpath", () => path);
        return this;
    }

    public async preCompute() {
        await Promise.all([this.runStat(), this.checkExists(), this.checkRealpath()]);
        return this;
    }
}
