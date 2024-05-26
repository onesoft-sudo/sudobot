import AbstractTask from "blazebuild/tasks/AbstractTask";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import { TaskOutputGenerator } from "blazebuild/tasks/TaskOutputGenerator";
import { Awaitable } from "blazebuild/types/utils";
import { $ } from "bun";
import { glob } from "glob";
import path from "path";

class BuildTask extends AbstractTask {
    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return glob(path.resolve(process.cwd(), "src/**/*.ts"));
    }

    @TaskOutputGenerator
    protected override generateOutput(): Awaitable<string[]> {
        return glob(path.resolve(process.cwd(), "build/out/**/*.js"));
    }

    @TaskAction
    protected override async run(): Promise<void> {
        await $`tsc`;
    }
}

export default BuildTask;
