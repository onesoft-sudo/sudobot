import { AbstractTask, IO, Task, TaskAction } from "blazebuild";
import { spawnSync } from "child_process";

@Task({
    description: "Runs the project",
    group: "Execution"
})
class RunTask extends AbstractTask {
    @TaskAction
    protected override async run() {
        IO.newline();
        const isNode = process.argv.includes("--node");

        if (isNode) {
            await this.blaze.taskManager.executeTask("build");
        }

        setTimeout(async () => {
            let code: number;
            const argv = this.blaze.cliArgs;

            if (isNode) {
                IO.newline();
                IO.println(
                    `[exec] node ${process.cwd()}/build/out/main/typescript/main.js ${argv.join(" ")}`
                );

                code =
                    spawnSync(
                        "node",
                        [`${process.cwd()}/build/out/main/typescript/main.js`, ...argv],
                        {
                            stdio: "inherit"
                        }
                    ).status ?? -1;
            } else {
                IO.newline();
                IO.println(
                    `[exec] bun ${process.cwd()}/src/main/typescript/bun.ts ${argv.join(" ")}`
                );
                code =
                    spawnSync("bun", [`${process.cwd()}/src/main/typescript/bun.ts`, ...argv], {
                        stdio: "inherit"
                    }).status ?? -1;
            }

            if (code !== 0) {
                IO.error("Failed to run the project");
                IO.exit(1);
            }
        }, 600);
    }
}

export default RunTask;
