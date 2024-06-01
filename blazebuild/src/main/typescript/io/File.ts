import type { BunFile } from "bun";
import FileAlreadyExistsError from "./FileAlreadyExistsError";
import type { Awaitable } from "../types/utils";
import { appendFile, lstat, rename, rm } from "fs/promises";
import type { Stats } from "fs";
import { join } from "path";
import FileNotFoundError from "./FileNotFoundError";
import FileWriter from "./FileWriter";
import FileIOError from "./FileIOError";
import type { FileResolvable } from "../types/file";

class File {
    private _path: string;
    private _bunfile?: BunFile;
    private _attributes: FileAttributes = {};
    private _statCompleted = false;

    public constructor(path: string) {
        this._path = path.at(0) === '/' ? path : join(process.cwd(), path);
    }

    public static resolve(resolvable: FileResolvable): File {
        return typeof resolvable === 'string' ? new File(resolvable) : resolvable;
    }

    public static async of(file: File): Promise<File>;
    public static async of(path: string): Promise<File>;

    public static async of(path: string | File): Promise<File> {
        if (typeof path !== 'string') {
            return path;
        }

        const file = new File(path);
        await file.stat();
        return file;
    }

    public static async create(path: string, createPath = false): Promise<File> {
        const file = new File(path);
        await file.create(createPath);
        return file;
    }

    private get bunfile() {
        if (!this._bunfile) {
            this._bunfile = Bun.file(this._path);
        }

        return this._bunfile;
    }

    private async attribute<K extends keyof FileAttributes>(name: K, computeDefault?: () => Awaitable<FileAttributes[K]>): Promise<FileAttributes[K]> {
        const value = this._attributes[name];

        if (value !== undefined) {
            return value;
        }

        if (!computeDefault) {
            throw new Error("Attribute value is undefined and no default value compute function is specified");
        }

        return computeDefault();
    }

    private syncAttribute<K extends keyof FileAttributes>(name: K, defaultValue?: FileAttributes[K]): NonNullable<FileAttributes[K]> {
        const value = this._attributes[name];

        if (value === undefined && defaultValue === undefined) {
            throw new Error(`Attribute ${name} is not set`);
        }

        return value === undefined ? defaultValue! : value;
    }

    private setSyncAttribute<K extends keyof FileAttributes>(name: K, value: FileAttributes[K]) {
        this._attributes[name] = value;
    }

    public async waitUntilUsable() {
        if (!this._statCompleted) {
            await this.stat();
        }
    }

    public get usable() {
        return this._statCompleted;
    }

    public get mode() {
        return this.syncAttribute("mode");
    }

    public set mode(value: number) {
        this.setSyncAttribute("mode", value);
    }

    public get exists() {
        return this.syncAttribute("exists", false);
    }

    public get path() {
        return this._path;
    }

    public get size() {
        return this.syncAttribute("size", 0);
    }

    public get createdTimestamp() {
        return this.syncAttribute("createdTimestamp");
    }

    public get modifiedTimestamp() {
        return this.syncAttribute("modifiedTimestamp");
    }

    public async create(createPath = false) {
        if (await this.bunfile.exists()) {
            throw new FileAlreadyExistsError(`File ${this._path} already exists`, this);
        }

        const mode = this.syncAttribute("mode", 0o644);

        try {
            await Bun.write(this.bunfile, "", {
                mode,
                createPath
            });
        }
        catch (error) {
            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to create file ${this._path}`, this, error);
            }

            throw error;
        }

        this.setSyncAttribute("exists", true);
        this.setSyncAttribute('mode', mode);
        this.setSyncAttribute('size', 0);
    }

    public async stat(): Promise<Stats | null> {
        try {
            const stat = await lstat(this._path);
            this.setSyncAttribute('mode', stat.mode);
            this.setSyncAttribute('size', stat.size);
            this.setSyncAttribute("exists", true);
            this.setSyncAttribute("createdTimestamp", stat.birthtimeMs);
            this.setSyncAttribute("modifiedTimestamp", stat.mtimeMs);
            this.setSyncAttribute("accessedTimestamp", stat.atimeMs);
            this._statCompleted = true;
            return stat;
        }
        catch (error) {
            this._attributes = {};
            this._statCompleted = false;

            if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' && error.code === 'ENOENT') {
                this.setSyncAttribute("exists", false);
                return null;
            }

            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to stat file ${this._path}`, this, error);
            }

            throw error;
        }
    }

    /**
     * Read file contents as text.
     *
     * @throws {FileNotFoundError} If the file does not exist
     * @return {Promise<string>} The text content
     */
    public readTextContent(): Promise<string> {
        try {
            this.assertExists();
            return this.bunfile.text();
        }
        catch (error) {
            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to read file ${this._path}`, this, error);
            }

            throw error;
        }
    }

    public readArrayBuffer() {
        try {
            this.assertExists();
            return this.bunfile.arrayBuffer();
        }
        catch (error) {
            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to read file ${this._path}`, this, error);
            }

            throw error;
        }
    }

    public async readJSON<T>(): Promise<T> {
        try {
            this.assertExists();
            return this.bunfile.json();
        }
        catch (error) {
            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to read file ${this._path}`, this, error);
            }

            throw error;
        }
    }

    public async writeContent(data: string | ArrayBuffer) {
        const mode = this.syncAttribute("mode", 0o644);

        try {
            await Bun.write(this.bunfile, data, {
                mode
            });
        }
        catch (error) {
            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to write file ${this._path}`, this, error);
            }

            throw error;
        }

        this.setSyncAttribute('size', typeof data === 'string' ? data.length : data.byteLength);
    }

    public async writeJSON(data: unknown) {
        await this.writeContent(JSON.stringify(data));
    }

    public createWriter(highWaterMark?: number) {
        const writer = this.bunfile.writer({ highWaterMark });
        return new FileWriter(writer, (size) => void this.setSyncAttribute('size', size));
    }

    public async appendTextContent(data: string | Uint8Array) {
        try {
            await appendFile(this._path, data);
        }
        catch (error) {
            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to write file ${this._path}`, this, error);
            }

            throw error;
        }

        this.setSyncAttribute('exists', true);
        this.setSyncAttribute('size', this.syncAttribute('size', 0) + data.length);
    }

    public async rename(destination: string) {
        this.assertExists();

        try {
            await rename(this._path, destination);
        }
        catch (error) {
            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to rename file ${this._path}`, this, error);
            }

            throw error;
        }

        this._path = destination;
    }

    public async delete() {
        this.assertExists();

        try {
            await rm(this._path);
        }
        catch (error) {
            if (error instanceof Error && 'syscall' in error) {
                throw new FileIOError(`Failed to delete file ${this._path}`, this, error);
            }

            throw error;
        }
    }

    private assertExists(): asserts this is this & { exists: true } {
        if (!this.exists) {        
            throw new FileNotFoundError(`File ${this._path} does not exist`, this);
        }
    }
}

type FileAttributes = {
    size?: number;
    mode?: number;
    exists?: boolean;
    createdTimestamp?: number;
    modifiedTimestamp?: number;
    accessedTimestamp?: number;
};

export default File;