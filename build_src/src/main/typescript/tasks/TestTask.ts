import {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    files,
    type Awaitable
} from "blazebuild";
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
