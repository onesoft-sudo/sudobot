import AbstractTask from "blazebuild/tasks/AbstractTask";
import { Task } from "blazebuild/tasks/Task";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import type { Awaitable } from "blazebuild/types/utils";
import { files } from "blazebuild/utils/glob";
import { $ } from "bun";

@Task({
    description: "Runs the tests",
    group: "Testing"
})
class TestTask extends AbstractTask {
    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return files(`${process.cwd()}/tests/**/*.ts`);
    }

    @TaskAction
    protected override async run(): Promise<void> {
        // if (!project.testsDir) {
        //     throw new Error("No tests directory specified.");
        // }

        await $`vitest --run`;
    }

    @TaskDependencyGenerator
    protected override dependencies() {
        return ["dependencies"];
    }
}

export default TestTask;
