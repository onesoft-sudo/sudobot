import "blazebuild/src/globals";

import { AbstractTask } from "blazebuild/src/core/AbstractTask";
import { Caching, CachingMode } from "blazebuild/src/decorators/Caching";
import { Dependencies } from "blazebuild/src/decorators/Dependencies";
import { Task } from "blazebuild/src/decorators/Task";
import IO from "blazebuild/src/io/IO";
import { spawnSync } from "child_process";

class RunTask extends AbstractTask {
    public override readonly name = "run";

    @Caching(CachingMode.Incremental)
    @Dependencies("dependencies")
    @Task({ name: "run", defaultDescription: "Runs the project", defaultGroup: "Other" })
    public override async execute() {
        setTimeout(async () => {
            let code = -1;

            if (process.argv.includes("--node")) {
                await tasks.execute("build");
                code =
                    spawnSync("node", [`${project.buildDir}/out/main/typescript/index.js`], {
                        stdio: "inherit"
                    }).status ?? -1;
            } else {
                code =
                    spawnSync("bun", [`${project.srcDir}/main/typescript/bun.ts`], {
                        stdio: "inherit"
                    }).status ?? -1;
            }

            if (code !== 0) {
                IO.fail("Failed to run the project");
            }
        }, 1000);
    }
}

export default RunTask;
