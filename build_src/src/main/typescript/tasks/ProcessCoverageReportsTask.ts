import {
    AbstractTask,
    Task,
    TaskAction,
    TaskContext,
    TaskInputGenerator,
    type Awaitable
} from "@onesoftnet/blazebuild";
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
    protected override async run(context: TaskContext): Promise<void> {
        const input = `${process.cwd()}/coverage`;
        const output = `${process.cwd()}/build/coverage`;

        if (existsSync(input)) {
            if (existsSync(output)) {
                await rm(output, { recursive: true });
            }

            await rename(input, output);
        }

        context.addOutput(output);
    }
}

export default ProcessCoverageReportsTask;
