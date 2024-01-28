import { readFile } from "fs/promises";

type ReadFileContentOptions<T extends boolean> = {
    json?: T;
};

type ReadFileResult<T extends boolean, J> = T extends true ? J : string;

export default class FileSystem {
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
}
