import AbstractTask, { TaskResolvable } from "blazebuild/tasks/AbstractTask";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import { TaskOutputGenerator } from "blazebuild/tasks/TaskOutputGenerator";
import type { Awaitable } from "blazebuild/types/utils";
import { $ } from "bun";
import { glob } from "glob";
import path from "path";
import DependenciesTask from "./DependenciesTask";

class CompileTypeScriptTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        await $`tsc`;
    }

    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return glob(path.resolve(process.cwd(), "src/**/*.ts"));
    }

    @TaskOutputGenerator
    protected override generateOutput(): Awaitable<string[]> {
        return glob(path.resolve(process.cwd(), "build/out/**/*.js"));
    }

    @TaskDependencyGenerator
    protected override dependencies(): Awaitable<Iterable<TaskResolvable<any>>> {
        return [DependenciesTask];
    }
}

export default CompileTypeScriptTask;
