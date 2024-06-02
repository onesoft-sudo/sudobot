import AbstractTask from "blazebuild/tasks/AbstractTask";
import { Task } from "blazebuild/tasks/Task";
import { TaskAction } from "blazebuild/tasks/TaskAction";
import { TaskInputGenerator } from "blazebuild/tasks/TaskInputGenerator";
import type { Awaitable } from "blazebuild/types/utils";
import { existsSync } from "fs";
import { rename, rm } from "fs/promises";

@Task({
    description: "Processes the coverage reports",
    group: "Testing"
})
class ProcessCoverageReportsTask extends AbstractTask {
    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return [`${process.cwd()}/coverage`];
    }

    @TaskAction
    protected override async run(): Promise<void> {
        const input = `${process.cwd()}/coverage`;
        const output = `${process.cwd()}/build/coverage`;

        if (existsSync(input)) {
            if (existsSync(output)) {
                await rm(output, { recursive: true });
            }
            await rename(input, output);
        }

        this.addOutput(output);
    }
}

export default ProcessCoverageReportsTask;
