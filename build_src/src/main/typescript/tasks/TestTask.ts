import "blazebuild/src/globals";

import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";
import { Task } from "blazebuild/src/decorators/Task";
import { existsSync } from "fs";
import { rename, rm } from "fs/promises";

class TestTask extends AbstractTask {
    public override readonly name = "test";

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies")
    @Task({
        name: "test",
        defaultDescription: "Runs the tests using Vitest",
        defaultGroup: "Testing"
    })
    public override async execute() {
        if (!project.testsDir) {
            throw new Error("No tests directory specified.");
        }

        await this.addInputsByGlob(`${project.testsDir}/**/*.ts`);
        await x("vitest --run");
    }

    @Caching(CachingMode.Incremental)
    @Dependencies("test")
    @Task({
        name: "processCoverageReports",
        noPrefix: true,
        defaultDescription: "Runs after the test task",
        defaultGroup: "Testing"
    })
    public async afterTest(): Promise<void> {
        const input = `${project.testsDir}/../coverage`;
        const output = `${project.buildDir}/coverage`;
        
        if (existsSync(input)) {
            if (existsSync(output)) {
                await rm(output, { recursive: true });
            }
            
            await rename(input, output);
        }
        this.addInputs("processCoverageReports", input);
        this.addOutputs("processCoverageReports", output);
    }
}

export default TestTask;
