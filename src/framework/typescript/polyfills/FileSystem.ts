/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { Stringable } from "../types/Stringable";

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
    public static async readFileContents<T extends boolean = false>(
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
    public static async exists(filePath: string) {
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
    public static async writeFileContents<J extends boolean = false>(
        path: string,
        contents: J extends true ? object : Stringable,
        json: J = false as J
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
