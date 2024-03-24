import IO from "../io/IO";
import { BuiltInTask } from "../types/BuiltInTask";

export const tasksTask: BuiltInTask = {
    name: "tasks",
    handler: async cli => {
        const { tasks } = cli;
        const taskNames = Array.from(tasks.keys()).sort((a, b) => a.localeCompare(b));

        IO.println("Available tasks:");

        for (const taskName of taskNames) {
            IO.println(`  ${taskName}`);
        }
    }
};
