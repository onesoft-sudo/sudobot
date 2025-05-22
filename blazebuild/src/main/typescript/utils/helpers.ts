import { $ } from "bun";
import { existsSync } from "fs";
import { glob } from "glob";
import path from "path";

export const x = async (command: string) => {
    const result = await $`${command}`;

    if (result.exitCode !== 0) {
        console.error(`Command failed: ${command}`);
        process.exit(result.exitCode);
    }
};

export const files = async (...paths: string[]) => {
    return await glob(paths);
};

export const isInPath = (bin: string): boolean => {
    const PATH = process.env.PATH?.split(":") ?? [];
    return PATH.some(p => existsSync(path.join(p, bin)));
};
