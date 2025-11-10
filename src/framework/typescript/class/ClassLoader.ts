/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import { effectiveExtension } from "@framework/utils/utils";
import type { Awaitable } from "discord.js";
import { lstat } from "fs/promises";
import { readdir } from "fs/promises";
import path from "path";

export type ClassLoadOptions<T, R> = {
    loader?: (exported: T) => R;
    preLoad?: (filepath: string) => Awaitable<void>;
    postLoad?: (filepath: string, exported: R) => Awaitable<void>;
};

class ClassLoader {
    private static readonly SRC_ROOT_DIR = path.resolve(__dirname, "../../..");

    public async loadClass<T, R = T>(file: string, options?: ClassLoadOptions<T, R>): Promise<R> {
        if (file[0] !== "/") {
            file = path.join(ClassLoader.SRC_ROOT_DIR, file);
        }

        await options?.preLoad?.(file);
        const module = await import(file);
        const processedModule = (options?.loader ? options.loader(module) : module) as R;
        await options?.postLoad?.(file, processedModule);
        return processedModule;
    }

    public async loadClassesRecursive<T, R = T>(directory: string, options?: ClassLoadOptions<T, R>): Promise<R[]> {
        if (directory[0] !== "/") {
            directory = path.join(ClassLoader.SRC_ROOT_DIR, directory);
        }

        const files = await readdir(directory, {
            recursive: true
        });

        const modules = [];

        for (const file of files) {
            if (!file.endsWith(`.${effectiveExtension}`)) {
                continue;
            }

            const fullpath = path.resolve(directory, file);
            await options?.preLoad?.(fullpath);
            const stat = await lstat(fullpath);

            if (stat.isDirectory()) {
                continue;
            }

            const module = await import(fullpath);
            const processedModule = options?.loader ? options.loader(module) : module;
            modules.push(processedModule);
            await options?.postLoad?.(fullpath, processedModule);
        }

        return modules;
    }
}

export default ClassLoader;
