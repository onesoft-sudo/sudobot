import { lstat } from "fs/promises";
import path from "path";
import Manager from "../core/Manager";
import MissingBuildScriptError from "../errors/MissingBuildScriptError";

export const BUILD_SCRIPT_PATH = "build.blaze.ts";

class BuildScriptManager extends Manager {
    private _buildScriptLastModTime?: number;

    public override async boot() {
        this._buildScriptLastModTime = (await lstat(BUILD_SCRIPT_PATH)).mtimeMs;
    }

    public get buildScriptLastModTime() {
        if (this._buildScriptLastModTime === undefined) {
            throw new Error("Build script is not loaded yet!");
        }

        return this._buildScriptLastModTime;
    }

    public async loadBuildScript() {
        const buildScriptPath = path.resolve(process.cwd(), BUILD_SCRIPT_PATH);

        if (!(await Bun.file(buildScriptPath).exists())) {
            throw new MissingBuildScriptError(
                `Missing build script! Expected at: ${buildScriptPath}`
            );
        }

        await this.setupEnvironment(global as Record<string, unknown>);
        await import(buildScriptPath);
    }

    private async setupEnvironment(global: Record<string, unknown>) {
        global.tasks = this.blaze.taskManager;
        global.blaze = this.blaze;
    }
}

export default BuildScriptManager;
