import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";
import { Task } from "blazebuild/src/decorators/Task";
import { File } from "blazebuild/src/io/File";
import { typescript } from "blazebuild/src/plugins/typescript";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

class BuildTask extends AbstractTask {
    public override readonly name = "build";

    private async resultIO(task?: string) {
        await this.addInputsByGlobForTask(
            task ?? this.name,
            `${this.blaze.projectManager.metadata.srcDir}/**/*.ts`
        );
        await this.addOutputsByGlobForTask(
            task ?? this.name,
            this.inputs.map(input =>
                File.of(input)
                    .path.replace(
                        this.blaze.projectManager.metadata.srcDir,
                        this.blaze.projectManager.metadata.buildDir
                    )
                    .replace(/\.ts$/, ".js")
            )
        );
    }

    @Caching(CachingMode.Incremental)
    @Task({
        name: "compileTypeScript",
        noPrefix: true,
        defaultDescription: "Compiles TypeScript files",
        defaultGroup: "Build"
    })
    public async compileTypeScript(): Promise<void> {
        await typescript.compile();
        await this.resultIO("compileTypeScript");
    }

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies", "compileTypeScript", "test")
    @Task({
        name: "build",
        noPrefix: true,
        defaultDescription: "Builds the project",
        defaultGroup: "Build"
    })
    public override async execute() {
        if (!this.blaze.taskManager.upToDateTasks.has("compileTypeScript")) {
            const tmpBuildDir = path.resolve(
                `${this.blaze.projectManager.metadata.buildDir}/../_build.tmp`
            );
            const targetDir = `${this.blaze.projectManager.metadata.buildDir}/out/src`;
            const tscOutput = `${this.blaze.projectManager.metadata.buildDir}/out`;

            if (existsSync(tmpBuildDir)) {
                await fs.rm(tmpBuildDir, { recursive: true, force: true });
            }

            await fs.rename(targetDir, tmpBuildDir);
            await fs.rm(this.blaze.projectManager.metadata.buildDir, {
                recursive: true,
                force: true
            });

            await fs.mkdir(tscOutput, {
                recursive: true
            });

            await fs.rename(tmpBuildDir, tscOutput);
            await this.blaze.taskManager.execute("processCoverageReports");
        }

        await this.resultIO();
        this.addOutputs(this.blaze.projectManager.metadata.buildDir);
    }
}

export default BuildTask;
