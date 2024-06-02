import AbstractTask from "blazebuild/tasks/AbstractTask";
import { Task } from "blazebuild/tasks/Task";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import { TaskOutputGenerator } from "blazebuild/tasks/TaskOutputGenerator";

@Task({
    description: "Builds the project",
    group: "Build"
})
class BuildTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {}

    @TaskDependencyGenerator
    protected override async dependencies() {
        return ["compile", "lint", "test"];
    }

    @TaskOutputGenerator
    protected override async generateOutput() {
        return ["build"];
    }
}

export default BuildTask;
