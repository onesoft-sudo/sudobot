import {
    AbstractTask,
    Task,
    TaskAction,
    TaskDependencyGenerator,
    TaskInputGenerator,
    TaskOutputGenerator,
    files,
    x,
    type Awaitable
} from "@onesoftnet/blazebuild";
import { rename, rm, symlink } from "fs/promises";
import path from "path";

@Task({
    description: "Compiles the TypeScript source files",
    group: "Build"
})
class CompileTypeScriptTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        await x(`tsc`);

        const buildOutputDirectory =
            this.blaze.projectManager.properties.structure
                ?.buildOutputDirectory;

        if (!buildOutputDirectory) {
            throw new Error(
                "buildOutputDirectory is not defined in project properties"
            );
        }

        await rename(
            path.join(buildOutputDirectory, "out/src"),
            path.join(buildOutputDirectory, "out.tmp")
        );

        await rm(path.join(buildOutputDirectory, "out"), {
            recursive: true,
            force: true
        });

        await rename(
            path.join(buildOutputDirectory, "out.tmp"),
            path.join(buildOutputDirectory, "out")
        );

        await symlink(
            path.join(process.cwd(), "package.json"),
            path.join(buildOutputDirectory, "package.json")
        );
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
    protected override dependencies() {
        return ["dependencies"];
    }
}

export default CompileTypeScriptTask;
