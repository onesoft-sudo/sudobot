import {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    files,
    x,
    type Awaitable
} from "@onesoftnet/blazebuild";
import { spawnSync } from "bun";

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
        const { exitCode } = spawnSync(["node_modules/.bin/vitest", "--run"], {
            stdio: ['inherit', 'inherit', 'inherit'],
            env: process.env
        });

        if (exitCode) {
            throw new Error(`vitest exited with code ${exitCode}`);
        }
    }

    @TaskDependencyGenerator
    protected override dependencies() {
        return ["dependencies"];
    }
}

export default TestTask;
