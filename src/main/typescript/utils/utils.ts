import { existsSync, mkdirSync } from "fs";
import path from "path";

export const systemPrefix = (subpath: string, createDir = false) => {
    const final = path.resolve(
        process.env.SUDO_PREFIX || __dirname,
        process.env.SUDO_PREFIX ? "." : "../../../..",
        subpath
    );

    if (createDir) {
        if (!existsSync(final)) {
            mkdirSync(final);
        }
    }

    return final;
};
