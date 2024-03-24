import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";

type Stringable = {
    toString(): string;
};

type ReadFileContentOptions<T extends boolean> = {
    json?: T;
};

type ReadFileResult<T extends boolean, J> = T extends true ? J : string;

/**
 * A file system utility class, that works with both Node.js and Bun.
 */
export default class FileSystem {
    /**
     * Reads the contents of a file.
     * @param path - The path of the file to read.
     * @param options - The options for reading the file.
     * @returns A promise that resolves to the contents of the file.
     */
    static async readFileContents<T extends boolean = false>(
        path: string,
        { json }: ReadFileContentOptions<T> = {}
    ): Promise<ReadFileResult<T, unknown>> {
        let contents = "";

        if (process.versions.bun) {
            const file = Bun.file(path);
            contents = await (json ? file.json() : file.text());
        } else {
            contents = await readFile(path, { encoding: "utf-8" });

            if (json) {
                return JSON.parse(contents);
            }
        }

        return contents as ReadFileResult<T, unknown>;
    }

    /**
     * Checks if a file exists.
     *
     * @param filePath - The path of the file to check.
     * @returns A promise that resolves to a boolean indicating if the file exists.
     */
    static async exists(filePath: string) {
        if (process.versions.bun) {
            return Bun.file(filePath).exists();
        } else {
            return existsSync(filePath);
        }
    }

    /**
     * Writes the contents to a file.
     *
     * @param path - The path of the file to write to.
     * @param contents - The contents to write to the file.
     * @returns A promise that resolves when the file is written.
     * @throws An error if the file cannot be written.
     */
    static async writeFileContents(
        path: string,
        contents: Stringable,
        json: boolean = false
    ): Promise<void> {
        if (process.versions.bun) {
            await Bun.write(path, json ? JSON.stringify(contents) : contents.toString());
        } else {
            await writeFile(path, json ? JSON.stringify(contents) : contents.toString(), {
                encoding: "utf-8"
            });
        }
    }
}
