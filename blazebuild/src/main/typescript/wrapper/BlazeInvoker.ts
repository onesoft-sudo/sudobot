import { spawn } from "child_process";
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
        IO.debug(`Invoking BlazeBuild: ${entryPath} ${process.argv.slice(2).join(" ")}`);
        const PATH = `${process.env.PATH}:${file("node_modules/.bin")}`;
        const child = spawn(BUN_INTERPRETER, [entryPath, ...process.argv.slice(2)], {
            stdio: this.wrapper.options.quiet ? "ignore" : "inherit",
            env: {
                ...process.env,
                PATH
            },
            detached: false
        });

        IO.debug(PATH);

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

export default BlazeInvoker;
