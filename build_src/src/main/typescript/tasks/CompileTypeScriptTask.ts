import {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    TaskOutputGenerator,
    files,
    type Awaitable
} from "blazebuild";
import { TaskResolvable } from "blazebuild/src/main/typescript/tasks/AbstractTask";
import { $ } from "bun";
import path from "path";

@Task({
    description: "Compiles the TypeScript source files",
    group: "Build"
})
class CompileTypeScriptTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        await $`tsc`;
    }

    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return files(path.resolve(process.cwd(), "src/**/*.ts"));
    }

    @TaskOutputGenerator
    protected override generateOutput(): Awaitable<string[]> {
        return files(path.resolve(process.cwd(), "build/out/**/*.js"));
    }

    @TaskDependencyGenerator
    protected override dependencies(): Awaitable<Iterable<TaskResolvable<any>>> {
        return ["dependencies"];
    }
}

export default CompileTypeScriptTask;
