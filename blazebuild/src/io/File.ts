import { Stats, existsSync, realpathSync, statSync } from "fs";
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
        return this.attribute("stat", () => statSync(this.path));
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
}
