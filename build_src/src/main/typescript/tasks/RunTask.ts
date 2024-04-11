import "blazebuild/src/globals";

import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";
import { Task } from "blazebuild/src/decorators/Task";
import { spawnSync } from "child_process";

class RunTask extends AbstractTask {
    public override readonly name = "run";

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies")
    @Task({ name: "run", defaultDescription: "Runs the project", defaultGroup: "Other" })
    public override async execute() {
        setTimeout(async () => {
            if (process.argv.includes("--node")) {
                await tasks.execute("build");
                spawnSync("node", [`${project.buildDir}/index.js`], { stdio: "inherit" });
            } else {
                spawnSync("bun", [`${project.srcDir}/bun.ts`], { stdio: "inherit" });
            }
        }, 1000);
    }
}

export default RunTask;
