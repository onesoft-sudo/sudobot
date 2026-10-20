import type { TaskAttributes } from "./TaskManager.js";

class TaskModifier {
    public constructor(protected readonly attr: TaskAttributes) {}

    public addDependency(dependency: string) {
        this.attr.dependencies.push(dependency);
        return this;
    }

    public setDependencies(...dependencies: string[]) {
        this.attr.dependencies = dependencies;
        return this;
    }
}

export default TaskModifier;
