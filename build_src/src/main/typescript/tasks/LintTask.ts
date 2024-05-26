import "blazebuild/types/build.d";

import AbstractTask from "blazebuild/tasks/AbstractTask";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { $ } from "bun";

class LintTask extends AbstractTask {
    @TaskAction
    protected override async run() {
        await $`eslint "${process.cwd()}/src"`;
    }
}

export default LintTask;
