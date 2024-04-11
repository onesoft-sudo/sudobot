import chalk from "chalk";
import { setTimeout } from "timers/promises";
import AbstractTask from "../../core/AbstractTask";
import { Caching, CachingMode } from "../../decorators/Caching";
import { BufferedProgress } from "../../io/BufferedProgress";
import IO from "../../io/IO";

@Caching(CachingMode.None)
class InitTask extends AbstractTask {
    public override readonly name = "init";
    public override readonly defaultDescription: string = "Initializes the build system";
    public override readonly defaultGroup: string = "Core";

    public override async execute(): Promise<void> {
        const IDLE_STATUS = chalk.white.dim("<idle>");
        const argv = process.argv.slice(1).filter(arg => !arg.startsWith("-"));

        if (process.argv[0] === process.execPath) {
            argv.shift();
        }

        await this.blaze.packageManager.loadPackageJSON();
        await this.blaze.taskManager.execute(
            ["dumpTypes", ...(argv.length === 0 ? ["build"] : argv)],
            false,
            {
                onExecBegin(tasks) {
                    let longestNameLength = 0;

                    for (const task of tasks) {
                        if (task.name.length > longestNameLength) {
                            longestNameLength = task.name.length;
                        }
                    }

                    if (process.stdout.isTTY) {
                        const progress = new BufferedProgress(
                            1,
                            tasks.size + 1,
                            longestNameLength + 2
                        );

                        progress.setStatus(IDLE_STATUS);
                        progress.initialize();
                        IO.setProgressBuffer(progress);
                    }
                },
                async onExecEnd() {
                    await setTimeout(350);
                    IO.getProgressBuffer()?.end();
                },
                onTaskEnd() {
                    IO.getProgressBuffer()?.render();
                    IO.getProgressBuffer()?.incrementProgress(1);
                    IO.getProgressBuffer()?.setStatus(IDLE_STATUS);
                },
                async onTaskBegin(task) {
                    IO.getProgressBuffer()?.render();
                    IO.getProgressBuffer()?.setStatus(`Task :${task.name}`);
                },
                async onTaskCancel() {
                    IO.getProgressBuffer()?.incrementProgress(1);
                    IO.getProgressBuffer()?.render();
                }
            }
        );
    }
}

export default InitTask;
