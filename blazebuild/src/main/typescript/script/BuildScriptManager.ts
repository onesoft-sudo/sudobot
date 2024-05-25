import { lstat } from "fs/promises";
import Manager from "../core/Manager";

export const BUILD_SCRIPT_PATH = "blazebuild/src/main/typescript/index.ts";

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
}

export default BuildScriptManager;
