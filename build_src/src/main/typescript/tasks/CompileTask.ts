import AbstractTask from "blazebuild/tasks/AbstractTask";
import { Task } from "blazebuild/tasks/Task";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import { TaskOutputGenerator } from "blazebuild/tasks/TaskOutputGenerator";
import type { Awaitable } from "blazebuild/types/utils";
import { files } from "blazebuild/utils/glob";
import path from "path";

@Task({
    description: "Compiles the source files",
    group: "Build"
})
class CompileTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {}

    @TaskDependencyGenerator
    protected override async dependencies() {
        return ["compileTypeScript"];
    }

    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return files(path.resolve(process.cwd(), "src/**/*.ts"));
    }

    @TaskOutputGenerator
    protected override generateOutput(): Awaitable<string[]> {
        return files(path.resolve(process.cwd(), "build/out/**/*.js"));
    }
}

export default CompileTask;
