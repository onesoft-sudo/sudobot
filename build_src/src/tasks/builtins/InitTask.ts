import AbstractTask from "../../core/AbstractTask";
import { Caching, CachingMode } from "../../decorators/Caching";
import { Task } from "../../decorators/Task";
import { BufferedProgress } from "../../io/BufferedProgress";
import IO from "../../io/IO";

@Caching(CachingMode.None)
class InitTask extends AbstractTask {
    public override readonly name = "init";

    public override async execute(): Promise<void> {
        const argv = process.argv.slice(1).filter(arg => !arg.startsWith("-"));

        if (process.argv[0] === process.execPath) {
            argv.shift();
        }

        await this.blaze.packageManager.loadPackageJSON();
        await this.blaze.taskManager.execute(
            // ["dumpTypes", ...(argv.length === 0 ? ["build"] : argv)],
            [...(argv.length === 0 ? ["build"] : argv)],
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
                        IO.setProgressBuffer(progress);
                    }
                },
                onExecEnd() {
                    IO.getProgressBuffer()?.end();
                },
                onTaskEnd() {
                    IO.getProgressBuffer()?.render();
                    IO.getProgressBuffer()?.incrementProgress(1);
                    IO.getProgressBuffer()?.setStatus("<idle>");
                },
                onTaskBegin(task) {
                    IO.getProgressBuffer()?.render();
                    IO.getProgressBuffer()?.setStatus(`:${task.name}`);
                },
                onTaskCancel() {
                    IO.getProgressBuffer()?.setMax(IO.getProgressBuffer()!.getMax() - 1);
                    IO.getProgressBuffer()?.render();
                }
            }
        );
    }

    @Task({ name: "test2", noPrefix: true })
    public test() {}
}

export default InitTask;
