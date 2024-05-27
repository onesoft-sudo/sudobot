import AbstractTask from "blazebuild/tasks/AbstractTask";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import type { Awaitable } from "blazebuild/types/utils";
import { $ } from "bun";
import { glob } from "glob";

class TestTask extends AbstractTask {
    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return glob(`${process.cwd()}/tests/**/*.ts`);
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
