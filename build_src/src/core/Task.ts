import { TaskHandler } from "../types/TaskHandler";
import type BlazeBuild from "./BlazeBuild";

export class Task {
    public constructor(
        private readonly cli: BlazeBuild,
        public readonly name: string,
        public readonly dependsOn: string[],
        public readonly handler: TaskHandler
    ) {}

    public async execute() {
        this.cli.executedTasks.push(this.name);

        for (const taskName of this.dependsOn) {
            this.cli.taskManager.execute(taskName);
        }

        await this.handler.call(this);
    }
}
