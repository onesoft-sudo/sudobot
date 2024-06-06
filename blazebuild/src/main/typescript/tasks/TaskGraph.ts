import chalk from "chalk";
import Blaze from "../core/Blaze";
import type { TaskDetails } from "./TaskManager";

class TaskGraph {
    public readonly taskDetails: TaskDetails<unknown>;

    public constructor(task: TaskDetails<unknown>) {
        this.taskDetails = task;
    }

    public async toString() {
        const dependenciesOutput = await this.internalToString(this.taskDetails, 1);
        return `${chalk.bold(dependenciesOutput === "" ? "-" : "+")} ${this.taskDetails.options?.name ?? this.taskDetails.task.name}\n${dependenciesOutput.trimEnd()}`;
    }

    private async internalToString(
        taskDetails: TaskDetails<unknown>,
        tabs = 0,
        visited = new Map<string, number>()
    ) {
        const taskManager = Blaze.getInstance().taskManager;
        let output = "";

        for (const dependency of await taskManager.getTaskDependencies(
            taskDetails.task,
            undefined,
            false
        )) {
            const dependenciesOutput = await this.internalToString(dependency, tabs + 1, visited);
            const name = dependency.options?.name ?? dependency.task.name;
            const appearance = visited.get(name) ?? 0;
            output += `${`${chalk.gray.dim("|")}  `.repeat(tabs)}${chalk.bold(dependenciesOutput === "" ? "-" : "+")} ${name}${appearance === 0 ? "" : ` ${chalk.white.dim(`[${appearance}]`)}`}\n`;
            output += dependenciesOutput;
            visited.set(name, appearance + 1);
        }

        return output;
    }
}

export default TaskGraph;
