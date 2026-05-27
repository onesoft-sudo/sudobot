import { AbstractTask, Task, TaskAction, TaskDependencyGenerator } from "@onesoftnet/blazebuild";
import { spawnSync } from "child_process";

@Task({
    description: "Runs the project",
    group: "Execution"
})
class RunTask extends AbstractTask {
    @TaskDependencyGenerator
    protected override dependencies() {
        return ["build"];
    }

    @TaskAction
    protected override async run() {
        setTimeout(async () => {
            let code: number;
            const argv = [] as string[];

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

            if (code !== 0) {
                console.error("Failed to run the project");
                process.exit(1);
            }
        }, 600);
    }
}

export default RunTask;
