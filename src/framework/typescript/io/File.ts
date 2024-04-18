import { Stats, close, closeSync, constants, existsSync, lstatSync, realpathSync } from "fs";
import { FileHandle, lstat, open, realpath } from "fs/promises";
import { basename, resolve } from "path";
import FileSystem from "../polyfills/FileSystem";

export type FileResolvable = string | File;

type Cache = {
    exists?: boolean;
    realpath?: string;
    basename?: string;
    stat?: Stats;
    handle?: FileHandle;
    error?: Error;
};

export enum FileState {
    Open,
    Closed,
    Error
}

export class File implements Disposable, AsyncDisposable {
    private cache: Cache = {};
    public readonly path: string;
    private _state: FileState = FileState.Closed;

    public constructor(path: string);
    public constructor(resolvable: FileResolvable);

    public constructor(resolvable: string | FileResolvable) {
        this.path = typeof resolvable === "string" ? resolve(resolvable) : resolvable.path;
    }

    public get state() {
        return this._state;
    }

    public get exists(): boolean {
        return this.attribute("exists", () => (this.cache.handle ? true : existsSync(this.path)));
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

    public readContents(buffer?: false): Promise<string>;
    public readContents(buffer: true): Promise<Buffer>;

    public async readContents(buffer: boolean = false): Promise<string | Buffer> {
        if (this.cache.handle) {
            return this.cache.handle!.readFile({
                encoding: buffer ? null : "utf8"
            });
        }

        const contents = await FileSystem.readFileContents(this.path);
        return buffer ? Buffer.from(contents) : contents;
    }

    public async readJson<T>(): Promise<T> {
        if (this.cache.handle) {
            return JSON.parse(
                await this.cache.handle!.readFile({
                    encoding: "utf8"
                })
            ) as T;
        }

        return FileSystem.readFileContents(this.path, { json: true }) as Promise<T>;
    }

    public writeContents(contents: string): Promise<void> {
        if (this.cache.handle) {
            return this.cache.handle.writeFile(contents);
        }

        return FileSystem.writeFileContents(this.path, contents);
    }

    public writeJson(contents: object): Promise<void> {
        if (this.cache.handle) {
            return this.cache.handle.writeFile(JSON.stringify(contents));
        }

        return FileSystem.writeFileContents(this.path, contents, true);
    }

    private attribute<K extends keyof Cache>(
        name: K,
        compute: () => NonNullable<Cache[K]>
    ): NonNullable<Cache[K]> {
        if (!(name in this.cache) || this.cache[name] === undefined) {
            this.cache[name] = compute();
        }

        return this.cache[name] as NonNullable<Cache[K]>;
    }

    public static async open(resolvable: FileResolvable, stat = false): Promise<File> {
        const file = File.of(resolvable);
        await file.passive(stat);
        return file;
    }

    public async passive(stat = false) {
        try {
            this.cache.handle = await open(this.path, constants.O_RDONLY);
            this._state = FileState.Open;
            this.cache.exists = true;

            if (stat) {
                this.cache.stat = await this.cache.handle.stat();
            }
        } catch (error) {
            this._state = FileState.Error;
            this.cache.error = error as Error;
        }

        return this;
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

    public async readLines(): Promise<Iterable<string> | AsyncIterable<string>> {
        if (this.cache.handle) {
            return this.cache.handle?.readLines();
        }

        return (await this.readContents()).split("\n");
    }

    public [Symbol.dispose]() {
        if (this.cache.handle !== undefined) {
            closeSync(this.cache.handle.fd);
        }
    }

    public [Symbol.asyncDispose]() {
        const handle = this.cache.handle;

        if (handle !== undefined) {
            return new Promise<void>((resolve, reject) => {
                close(handle.fd, error => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }

        return Promise.resolve();
    }
}
