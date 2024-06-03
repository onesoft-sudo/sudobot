import { AbstractTask, Task, TaskAction, IO } from "blazebuild";
import { spawnSync } from "child_process";

@Task({
    description: "Runs the project",
    group: "Execution"
})
class RunTask extends AbstractTask {
    @TaskAction
    protected override run() {
        setTimeout(async () => {
            let code = -1;

            if (process.argv.includes("--node")) {
                await this.blaze.taskManager.executeTask("build");
                code =
                    spawnSync("node", [`${process.cwd()}/build/out/main/typescript/index.js`], {
                        stdio: "inherit"
                    }).status ?? -1;
            } else {
                code =
                    spawnSync("bun", [`${process.cwd()}/src/main/typescript/bun.ts`], {
                        stdio: "inherit"
                    }).status ?? -1;
            }

            if (code !== 0) {
                IO.error("Failed to run the project");
                IO.exit(1);
            }
        }, 1000);
    }
}

export default RunTask;
