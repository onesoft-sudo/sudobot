import { existsSync } from "fs";
import { lstat, readdir } from "fs/promises";
import path from "path";
import type Blaze from "../core/Blaze";
import Manager from "../core/Manager";
import MissingBuildScriptError from "../errors/MissingBuildScriptError";
import IO, { println } from "../io/IO";
import type BlazePlugin from "../plugins/BlazePlugin";

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
        await this.loadBuildSrc();
        await import(buildScriptPath);
    }

    private async setupEnvironment(global: Record<string, unknown>) {
        global.tasks = this.blaze.taskManager;
        global.project = this.blaze.projectManager.getProxy();
        global.blaze = this.blaze;
        global.println = println;
    }

    private async loadBuildSrc() {
        const buildSrcPath = path.resolve(process.cwd(), "build_src/src/main/typescript");

        if (!existsSync(buildSrcPath)) {
            return;
        }

        const files = await readdir(buildSrcPath);
        let pluginPath: string | undefined;

        for (const file of files) {
            const resolved = path.resolve(buildSrcPath, file);

            if (file.endsWith("Plugin.ts") && (await lstat(resolved)).isFile()) {
                pluginPath = resolved;
                break;
            }
        }

        if (!pluginPath) {
            IO.fatal("No plugin found in build_src!");
        }

        // HACK: This is a dummy implementation of plugin loading.
        const { default: Plugin }: { default: new (blaze: Blaze) => BlazePlugin } = await import(
            pluginPath
        );
        const plugin = new Plugin(this.blaze);
        await plugin.boot();

        if (plugin.tasks) {
            for (const task of await plugin.tasks()) {
                this.blaze.taskManager.register(task);
            }
        }
    }
}

export default BuildScriptManager;
