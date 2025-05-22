import {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    files,
    type Awaitable
} from "@onesoftnet/blazebuild";
import { $ } from "bun";
import path from "path";

@Task({
    description: "Lints the source files",
    group: "Analysis"
})
class LintTask extends AbstractTask {
    @TaskAction
    protected override async run() {
        await $`bun x eslint "${process.cwd()}/src"`;
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
