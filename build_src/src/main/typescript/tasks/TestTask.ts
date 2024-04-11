import "blazebuild/src/globals";

import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";

class TestTask extends AbstractTask {
    public override readonly name = "test";

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies")
    public override async execute() {
        if (!project.testsDir) {
            throw new Error("No tests directory specified.");
        }

        await this.addInputsByGlob(`${project.testsDir}/**/*.ts`);
        await x("vitest --run");
    }
}

export default TestTask;
