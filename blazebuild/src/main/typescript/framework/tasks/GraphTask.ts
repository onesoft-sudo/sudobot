import IO from "../../io/IO";
import AbstractTask from "../../tasks/AbstractTask";
import { Task } from "../../tasks/Task";
import { TaskAction } from "../../tasks/TaskAction";

@Task({
    description: "Graphs the project's dependencies.",
    group: "Help"
})
class GraphTask extends AbstractTask {
    protected override readonly parseArgsOptions = {
        allowPositionals: true
    };

    @TaskAction
    public override async run() {
        if (this.positionalArgs.length === 0) {
            IO.fatal("No task specified. Please specify at least one task to graph.");
        }

        for (const taskName of this.positionalArgs) {
            const graph = await this.blaze.taskManager.getTaskGraph(taskName);
            IO.newline();
            IO.println(await graph.toString());
        }
    }
}

export default GraphTask;
