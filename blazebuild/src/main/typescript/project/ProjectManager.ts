import { glob } from "glob";
import { lstat } from "node:fs/promises";
import path from "node:path";
import os from "os";
import type { Build } from "../core/Build.js";
import type { Project } from "./Project.js";
import { Version } from "./Version.js";

export class ProjectManager {
    private readonly root = process.env.BLAZEW_INTERNAL_DIR || "test";
    public readonly project = this.createDefaultProject();

    public constructor(private readonly build: Build) {}

    public getRoot() {
        return this.root;
    }

    public getBuildScriptPath() {
        return path.join(this.root, "build.blaze.mts");
    }

    public getCacheDirectoryPath() {
        return path.join(this.root, ".blazebuild");
    }

    public createDefaultProject(): Project {
        return {
            name: path.basename(this.root),
            version: Version.from("0.0.0"),
            author: {
                name: os.userInfo().username
            },
            structure: {
                buildDirectory: path.join(this.root, "build"),
                sourceDirectory: path.join(this.root, "src"),
                typescriptConfigurationFile: path.join(this.root, "tsconfig.json")
            },
            manager: this
        };
    }

    public async getBuildSourceModificationTime() {
        const dir = this.project.structure.buildSourceDirectory;

        if (!dir) {
            return 0;
        }

        const files = await glob(path.join(dir, "**/*"));
        let max = 0;

        for (const file of files) {
            const stat = await lstat(file);

            if (stat.mtimeMs > max) {
                max = stat.mtimeMs;
            }
        }

        return max;
    }

    public async getBuildScriptModificationTime() {
        return (await lstat(this.getBuildScriptPath())).mtimeMs;
    }
}
