import "blazebuild/src/globals";

import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";
import { Task } from "blazebuild/src/decorators/Task";

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
}

export default TestTask;
