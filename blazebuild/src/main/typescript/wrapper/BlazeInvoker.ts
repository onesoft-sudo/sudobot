import { existsSync } from "fs";
import IO from "./IO";
import UsesWrapper from "./UsesWrapper";
import { BUN_INTERPRETER, file } from "./utils";

class BlazeInvoker extends UsesWrapper {
    private findBlazePath() {
        const blazePath = file(this.wrapper.properties.get("blaze.srcpath", "blazebuild"));

        if (!existsSync(blazePath)) {
            throw new Error(
                `Could not determine where BlazeBuild is installed! Tried path: ${blazePath}`
            );
        }

        return blazePath;
    }

    private findEntryPath() {
        const blazePath = this.findBlazePath();
        const entryPath = `${blazePath}/src/main/typescript/cli.ts`;

        if (!existsSync(entryPath)) {
            throw new Error(
                `Failed to find entry file for execution in directory: ${blazePath} (Path: ${entryPath})`
            );
        }

        return entryPath;
    }

    public async invoke() {
        const entryPath = this.findEntryPath();
        IO.debug(`Invoking BlazeBuild: ${entryPath} ${this.wrapper.positionalArgs.join(" ")}`);

        if (process.isBun) {
            const shellPromise =
                Bun.$`${BUN_INTERPRETER} ${entryPath} ${this.wrapper.positionalArgs}`.env(
                    process.env as Record<string, string>
                );

            let result: Awaited<typeof shellPromise>;

            if (this.wrapper.options.quiet) {
                result = await shellPromise.quiet();
            } else {
                result = await shellPromise;
            }

            if (result.exitCode !== 0) {
                process.exit(result.exitCode);
            }
        } else {
            const { spawn } = await import("child_process");
            const child = spawn(BUN_INTERPRETER, [entryPath, ...this.wrapper.positionalArgs], {
                stdio: this.wrapper.options.quiet ? "ignore" : "inherit",
                env: process.env
            });

            if (child.exitCode !== 0) {
                process.exit(child.exitCode ?? 1);
            }

            if (child.exitCode === null) {
                const code = await new Promise<number>(resolve => {
                    child.on("exit", code => {
                        resolve(code ?? 1);
                    });
                });

                if (code !== 0) {
                    process.exit(code);
                }
            }
        }
    }
}

export default BlazeInvoker;
