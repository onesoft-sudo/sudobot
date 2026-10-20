import { glob } from "glob";
import { existsSync } from "node:fs";
import path from "node:path";
import { command } from "../../shell/shell.js";
import { CreateTask } from "../../tasks/CreateTask.js";
import { TaskStatus } from "../../tasks/TaskStatus.js";

class CompileBuildSrcTask extends CreateTask {
    public override readonly description = "Compile build_src/ (if present)";

    public override precondition() {
        return existsSync(this.build.projectManager.getBuildSrcDirectoryPath());
    }

    public override inputs() {
        return glob(path.join(this.build.projectManager.getBuildSrcDirectoryPath(), "src/**/*.{ts,json}"));
    }

    public override async outputs() {
        const inputs = await this.inputs();

        return inputs.flatMap(input => {
            const file = input.replace(
                path.join(this.build.projectManager.getBuildSrcDirectoryPath(), "src"),
                path.join(this.build.projectManager.getBuildSrcDirectoryPath(), "build")
            );
            return [file.replace(/\.(c|m)?ts$/, ".js"), file.replace(/\.(c|m)?ts$/, ".d.ts")];
        });
    }

    public override async execute() {
        const pwd = process.cwd();
        process.chdir(this.build.projectManager.getBuildSrcDirectoryPath());
        await command("tsc");
        process.chdir(pwd);
        return TaskStatus.Success;
    }
}

export default CompileBuildSrcTask;
