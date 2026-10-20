import { spawn, type SpawnOptions } from "node:child_process";

export const command = (
    prog: string,
    args: string[] = [],
    options: SpawnOptions = {
        stdio: "inherit"
    }
) => {
    return new Promise<void>((resolve, reject) => {
        const child = spawn(prog, args, options);

        child.on("error", reject);
        child.on("exit", code => {
            if (code !== 0) {
                reject(new Error(`Command exited with code ${code}: ${prog} ${args.join(" ")}`));
            } else {
                resolve();
            }
        });
    });
};
