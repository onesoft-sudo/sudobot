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
        await x("vitest --run");
    }

    @TaskDependencyGenerator
    protected override dependencies() {
        return ["dependencies"];
    }
}

export default TestTask;
