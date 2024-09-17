/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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
import type { StringLike } from "../types/StringLike";

type ReadFileContentOptions<T extends boolean> = {
    json?: T;
};

type ReadFileResult<T extends boolean, J> = T extends true ? J : string;


export default class FileSystem {
    
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

    
    public static async exists(filePath: string) {
        if (process.versions.bun) {
            return Bun.file(filePath).exists();
        } else {
            return existsSync(filePath);
        }
    }

    
    public static async writeFileContents<J extends boolean = false>(
        path: string,
        contents: J extends true ? object : StringLike,
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
