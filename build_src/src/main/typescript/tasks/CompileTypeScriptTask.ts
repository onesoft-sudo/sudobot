import { command, CreateTask, TaskStatus } from "@onesoftnet/blazebuild";
import { glob } from "glob";
import { cp } from "node:fs/promises";
import path from "node:path";
import { BuildConfiguration } from "../config/BuildConfiguration.js";

class CompileTypeScriptTask extends CreateTask {
    public override readonly description = "Compile the TypeScript source files";

    public override inputs() {
        return glob(
            BuildConfiguration.sourceModules.map(module =>
                path.join(this.build.projectManager.getSourceDirectoryPath(), module, "typescript/**/*.ts")
            )
        );
    }

    public override async outputs() {
        const inputs = await this.inputs();

        return inputs.flatMap(input => {
            const file = input.replace(
                this.build.projectManager.getSourceDirectoryPath(),
                path.join(this.build.projectManager.getBuildDirectoryPath(), "out")
            );

            return [
                file.replace(/\.(c|m)?ts$/, ".js").replace(/\.d\.js$/, ".d.ts"),
                file.endsWith(".d.ts") ? "" : file.replace(/\.(c|m)?ts$/, ".d.ts")
            ].filter(Boolean);
        });
    }

    public override async execute() {
        const declarationFiles = await glob(
            BuildConfiguration.sourceModules.map(module =>
                path.join(this.build.projectManager.getSourceDirectoryPath(), module, "typescript/**/*.d.ts")
            )
        );

        const cwd = process.cwd();
        process.chdir(this.build.projectManager.getRoot());
        await command("tsc");
        process.chdir(cwd);

        for (const file of declarationFiles) {
            await cp(
                file,
                file.replace(
                    this.build.projectManager.getSourceDirectoryPath(),
                    path.join(this.build.projectManager.getBuildDirectoryPath(), "out")
                )
            );
        }

        return TaskStatus.Success;
    }
}

export default CompileTypeScriptTask;
