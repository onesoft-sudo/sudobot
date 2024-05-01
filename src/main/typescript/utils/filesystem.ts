import Application from "@framework/app/Application";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";

export async function prefixedPath(path: string, options?: PrefixedPathOptions): Promise<string> {
    path = join(process.env.SUDO_ENV ?? Application.current().projectRootPath, path);

    if (options?.createDirIfNotExists && !existsSync(path)) {
        await mkdir(path, { recursive: true });
    } else if (options?.createParentDirIfNotExists) {
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
