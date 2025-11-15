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

import Application from "@framework/app/Application";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";

export async function prefixedPath(path: string, options?: PrefixedPathOptions): Promise<string> {
    path = join(process.env.SUDOBOT_PREFIX ?? Application.current().projectRootDirectoryPath, path);

    if (options?.createDirIfNotExists && !existsSync(path)) {
        await mkdir(path, { recursive: true });
    }
    else if (options?.createParentDirIfNotExists) {
        const parentDir = dirname(path);

        if (!existsSync(parentDir)) {
            await mkdir(parentDir, { recursive: true });
        }
    }

    return path;
}

export type PrefixedPathOptions = {
    createDirIfNotExists?: boolean;
    createParentDirIfNotExists?: boolean;
};
