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
import { $ } from "bun";
import path from "path";

@Task({
    description: "Compiles the source files",
    group: "Build"
})
class CompileTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        const buildOutputDirectory =
            this.blaze.projectManager.properties.structure?.buildOutputDirectory;

        if (!buildOutputDirectory) {
            throw new Error("buildOutputDirectory is not defined in project properties");
        }

        await $`mv ${buildOutputDirectory}/out/src ${buildOutputDirectory}/out.tmp`;
        await $`rm -rf ${buildOutputDirectory}/out`;
        await $`mv ${buildOutputDirectory}/out.tmp ${buildOutputDirectory}/out`;
    }

    @TaskDependencyGenerator
    protected override async dependencies() {
        return ["compileTypeScript"];
    }

    @TaskInputGenerator
    protected override generateInput(): Awaitable<string[]> {
        return files(path.resolve(process.cwd(), "src/**/*.ts"));
    }

    @TaskOutputGenerator
    protected override generateOutput(): Awaitable<string[]> {
        return files(path.resolve(process.cwd(), "build/out/**/*.js"));
    }
}

export default CompileTask;
