import "blazebuild/src/globals";

import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";
import { Task } from "blazebuild/src/decorators/Task";

class LintTask extends AbstractTask {
    public override readonly name = "lint";

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies")
    @Task({
        name: "lint",
        defaultDescription: "Lints the project using ESLint",
        defaultGroup: "Other"
    })
    public override async execute() {
        await x(`eslint "${project.srcDir}"`);
    }
}

export default LintTask;
