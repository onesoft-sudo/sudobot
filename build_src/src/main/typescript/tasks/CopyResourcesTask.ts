import { CreateTask, TaskStatus } from "@onesoftnet/blazebuild";
import { existsSync } from "node:fs";
import { cp } from "node:fs/promises";
import path from "node:path";
import { BuildConfiguration } from "../config/BuildConfiguration.js";

class CopyResourcesTask extends CreateTask {
    public override readonly description = "Copy resources to build directory";

    public override dependencies() {
        return ["compile"];
    }

    public override inputs() {
        return BuildConfiguration.sourceModules
            .map(module => path.join(this.build.projectManager.getSourceDirectoryPath(), module, "resources"))
            .filter(existsSync);
    }

    public override outputs() {
        return this.inputs().map(respath =>
            respath.replace(
                this.build.projectManager.getSourceDirectoryPath(),
                path.join(this.build.projectManager.getBuildDirectoryPath(), "out")
            )
        );
    }

    public override async execute() {
        for (const module of BuildConfiguration.sourceModules) {
            await cp(
                path.join(this.build.projectManager.getSourceDirectoryPath(), module, "resources"),
                path.join(this.build.projectManager.getBuildDirectoryPath(), "out", module, "resources"),
                { recursive: true }
            );
        }

        return TaskStatus.Success;
    }
}

export default CopyResourcesTask;
