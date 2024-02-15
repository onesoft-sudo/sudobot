import { existsSync } from "fs";
import { readFile } from "fs/promises";

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
    static async readFileContents<J = any, T extends boolean = false>(
        path: string,
        { json }: ReadFileContentOptions<T> = {}
    ): Promise<ReadFileResult<T, J>> {
        let contents = "";

        if (process.versions.bun) {
            contents = await Bun.file(path).text();
        } else {
            contents = await readFile(path, { encoding: "utf-8" });
        }

        if (json) {
            return JSON.parse(contents);
        }

        return contents as ReadFileResult<T, J>;
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
}
