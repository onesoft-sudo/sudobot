import { BufferedProgress } from "../io/BufferedProgress";
import IO from "../io/IO";
import { BuiltInTask } from "../types/BuiltInTask";

export const initTask: BuiltInTask = {
    name: "init",
    handler: async cli => {
        const argv = process.argv.slice(1);

        if (process.argv[0] === process.execPath) {
            argv.shift();
        }

        await cli.packageManager.loadPackageJSON();
        await cli.taskManager.execute(argv, false, {
            onExecBegin(tasks) {
                let longestNameLength = 0;

                for (const task of tasks) {
                    if (task.name.length > longestNameLength) {
                        longestNameLength = task.name.length;
                    }
                }

                const progress = new BufferedProgress(1, tasks.size + 1, longestNameLength);
                IO.setProgressBuffer(progress);
            },
            onExecEnd() {
                IO.getProgressBuffer()?.end();
            },
            async onTaskEnd() {
                IO.getProgressBuffer()?.incrementProgress(1);
                IO.getProgressBuffer()?.setStatus("<idle>");
            },
            async onTaskBegin(task) {
                IO.getProgressBuffer()?.setStatus(`:${task.name}`);
            }
        });
    }
};
