import AbstractTask from "blazebuild/tasks/AbstractTask";
import { Task } from "blazebuild/tasks/Task";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskOutputGenerator } from "blazebuild/tasks/TaskOutputGenerator";
import { rm } from "fs/promises";

@Task({
    description: "Cleans the project",
    group: "Build"
})
class CleanTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        await rm("build", { recursive: true, force: true });
    }

    @TaskOutputGenerator
    protected override async generateOutput() {
        return ["build"];
    }
}

export default CleanTask;
