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
        IO.debug(`Invoking BlazeBuild: ${entryPath} ${this.wrapper.positionalArgs.join(" ")}`);

        const child = spawn(BUN_INTERPRETER, [entryPath, ...this.wrapper.positionalArgs], {
            stdio: this.wrapper.options.quiet ? "ignore" : "inherit",
            env: process.env
        });

        if (child.exitCode !== null) {
            process.exit(child.exitCode);
        }

        child.on("exit", code => {
            process.exit(code ?? 1);
        });
    }
}

export default BlazeInvoker;
