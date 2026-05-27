import { spawn } from "child_process";
import { existsSync } from "fs";
import { glob } from "glob";
import path from "path";

export const x = async (command: string) => {
    const proc = spawn(command, {
        stdio: "inherit",
        shell: true,
        env: {
            ...process.env,
            PATH: `${path.join("node_modules", ".bin")}${path.delimiter}${process.env.PATH}`
        }
    });

    await new Promise((resolve, reject) => {
        proc.once("error", reject);
        proc.once("close", resolve);
        proc.once("disconnect", resolve);
        proc.once("exit", resolve);
    });

    if (proc.exitCode !== 0) {
        throw new Error(`Command failed: ${command}`);
    }
};

export const files = async (...paths: string[]) => {
    return await glob(paths);
};

export const isInPath = (bin: string): boolean => {
    const PATH = process.env.PATH?.split(":") ?? [];
    return PATH.some(p => existsSync(path.join(p, bin)));
};
