import "blazebuild/types/build.d";

import AbstractTask from "blazebuild/tasks/AbstractTask";
import { Task } from "blazebuild/tasks/Task";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskDependencyGenerator } from "blazebuild/tasks/TaskDependencyGenerator";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import type { Awaitable } from "blazebuild/types/utils";
import { files } from "blazebuild/utils/glob";
import { $ } from "bun";
import path from "path";

@Task({
    description: "Lints the source files",
    group: "Analysis"
})
class LintTask extends AbstractTask {
    @TaskAction
    protected override async run() {
        await $`eslint "${process.cwd()}/src"`;
    }

    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return files(path.resolve(process.cwd(), "src/**/*.ts"));
    }

    @TaskDependencyGenerator
    protected override dependencies() {
        return ["dependencies"];
    }
}

export default LintTask;
