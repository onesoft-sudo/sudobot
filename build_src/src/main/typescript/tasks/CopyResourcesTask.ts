import {
    AbstractTask,
    Task,
    TaskAction,
    TaskInputGenerator,
    TaskOutputGenerator
} from "blazebuild";
import { $ } from "bun";

@Task({
    description: "Copies the resources",
    group: "Build"
})
class CopyResourcesTask extends AbstractTask {
    @TaskAction
    protected override async run(): Promise<void> {
        const sourcesRootDirectory =
            this.blaze.projectManager.properties.structure?.sourcesRootDirectory;
        const buildOutputDirectory =
            this.blaze.projectManager.properties.structure?.buildOutputDirectory;
        const modules = this.blaze.projectManager.properties.structure?.sourceModules;

        if (!buildOutputDirectory) {
            throw new Error("buildOutputDirectory is not defined in project properties");
        }

        if (!modules) {
            throw new Error("sourceModules is not defined in project properties");
        }

        if (!sourcesRootDirectory) {
            throw new Error("sourcesRootDirectory is not defined in project properties");
        }

        for (const module of modules) {
            await $`cp -r ${sourcesRootDirectory}/${module}/resources ${buildOutputDirectory}/out/${module}/resources`;
        }
    }

    @TaskOutputGenerator
    protected override generateOutput() {
        const sourcesRootDirectory =
            this.blaze.projectManager.properties.structure?.sourcesRootDirectory;
        const buildOutputDirectory =
            this.blaze.projectManager.properties.structure?.buildOutputDirectory;
        const modules = this.blaze.projectManager.properties.structure?.sourceModules;

        if (!buildOutputDirectory) {
            throw new Error("buildOutputDirectory is not defined in project properties");
        }

        if (!modules) {
            throw new Error("sourceModules is not defined in project properties");
        }

        return modules.map(module => `${buildOutputDirectory}/out/${module}/resources`);
    }

    @TaskInputGenerator
    protected override generateInput() {
        const sourcesRootDirectory =
            this.blaze.projectManager.properties.structure?.sourcesRootDirectory;
        const modules = this.blaze.projectManager.properties.structure?.sourceModules;

        if (!modules) {
            throw new Error("sourceModules is not defined in project properties");
        }

        if (!sourcesRootDirectory) {
            throw new Error("sourcesRootDirectory is not defined in project properties");
        }

        return modules.map(module => `${sourcesRootDirectory}/${module}/resources`);
    }
}

export default CopyResourcesTask;
