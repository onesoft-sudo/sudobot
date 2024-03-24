import { BuiltInTask } from "../types/BuiltInTask";

export const initTask: BuiltInTask = {
    name: "init",
    handler: async cli => {
        const argv = [...process.argv];

        if (argv[0] === process.execPath) {
            argv.shift();
        }

        argv.shift();

        const [taskName] = argv;
        await cli.taskManager.execute(taskName ?? "build");
    }
};
