import { AbstractTask, Task, TaskAction } from "@onesoftnet/blazebuild";
import { spawnSync } from "child_process";

@Task({
    description: "Runs the project",
    group: "Execution"
})
class RunTask extends AbstractTask {
    @TaskAction
    protected override async run() {
        const isNode = process.argv.includes("--node");

        if (isNode) {
            await this.blaze.taskManager.execute("build");
        }

        setTimeout(async () => {
            let code: number;
            const argv = [] as string[];

            if (isNode) {
                console.log(
                    `[exec] node ${process.cwd()}/build/out/main/typescript/main.js ${argv.join(" ")}`
                );

                code =
                    spawnSync(
                        "node",
                        [
                            `${process.cwd()}/build/out/main/typescript/main.js`,
                            ...argv
                        ],
                        {
                            stdio: "inherit"
                        }
                    ).status ?? -1;
            } else {
                console.log(
                    `[exec] bun ${process.cwd()}/src/main/typescript/bun.ts ${argv.join(" ")}`
                );
                code =
                    spawnSync(
                        "bun",
                        [
                            `${process.cwd()}/src/main/typescript/bun.ts`,
                            ...argv
                        ],
                        {
                            stdio: "inherit"
                        }
                    ).status ?? -1;
            }

            if (code !== 0) {
                console.error("Failed to run the project");
                process.exit(1);
            }
        }, 600);
    }
}

export default RunTask;
