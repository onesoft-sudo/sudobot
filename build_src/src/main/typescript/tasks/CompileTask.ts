import {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    TaskOutputGenerator,
    files,
    type Awaitable
} from "@onesoftnet/blazebuild";
import path from "path";

@Task({
    description: "Compiles the source files",
    group: "Build"
})
class CompileTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        const buildOutputDirectory =
            this.blaze.projectManager.properties.structure
                ?.buildOutputDirectory;

        if (!buildOutputDirectory) {
            throw new Error(
                "buildOutputDirectory is not defined in project properties"
            );
        }
    }

    @TaskDependencyGenerator
    protected override async dependencies() {
        return ["dependencies", "compileTypeScript"];
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
