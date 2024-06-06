import IO from "../../io/IO";
import AbstractTask from "../../tasks/AbstractTask";
import { Task } from "../../tasks/Task";
import { TaskAction } from "../../tasks/TaskAction";

@Task({
    description: "Graphs the project's dependencies.",
    group: "Help"
})
class GraphTask extends AbstractTask {
    @TaskAction
    public override async run() {
        this.blaze.taskNames.shift();
        const taskName = this.blaze.taskNames.shift();

        if (!taskName) {
            IO.fatal("No task specified. Please specify a task to graph.");
        }

        const graph = await this.blaze.taskManager.getTaskGraph(taskName);
        console.log("\n" + (await graph.toString()));
    }
}

export default GraphTask;
