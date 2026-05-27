import {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    files,
    type Awaitable
} from "@onesoftnet/blazebuild";
import { spawnSync } from 'child_process';

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
        const { status } = spawnSync("node_modules/.bin/vitest --run", {
            stdio: 'inherit',
            env: process.env,
            shell: true,
        });

        if (status !== 0) {
            throw new Error(`vitest exited with code ${status}`);
        }
    }

    @TaskDependencyGenerator
    protected override dependencies() {
        return ["dependencies"];
    }
}

export default TestTask;
