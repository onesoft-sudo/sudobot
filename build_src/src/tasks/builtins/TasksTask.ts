import AbstractTask from "../../core/AbstractTask";
import { Caching, CachingMode } from "../../decorators/Caching";
import IO from "../../io/IO";

@Caching(CachingMode.None)
class TasksTask extends AbstractTask {
    public override readonly name = "tasks";

    public override async execute(): Promise<void> {
        const { tasks } = this.blaze.taskManager;
        const taskNames = Array.from(tasks.keys()).sort((a, b) => a.localeCompare(b));

        IO.println("Available tasks:");

        for (const taskName of taskNames) {
            IO.println(`  ${taskName}`);
        }
    }
}

export default TasksTask;
