import { BufferedProgress } from "../io/BufferedProgress";
import IO from "../io/IO";
import { BuiltInTask } from "../types/BuiltInTask";

export const initTask: BuiltInTask = {
    name: "init",
    handler: async cli => {
        const argv = process.argv.slice(1).filter(arg => !arg.startsWith("-"));

        if (process.argv[0] === process.execPath) {
            argv.shift();
        }

        await cli.packageManager.loadPackageJSON();
        await cli.taskManager.execute(argv.length === 0 ? ["build"] : argv, false, {
            onExecBegin(tasks) {
                let longestNameLength = 0;

                for (const task of tasks) {
                    if (task.name.length > longestNameLength) {
                        longestNameLength = task.name.length;
                    }
                }

                if (process.stdout.isTTY) {
                    const progress = new BufferedProgress(1, tasks.size + 1, longestNameLength + 2);
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
        });
    }
};
