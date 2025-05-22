import type BlazeBuild from "../core/BlazeBuild";
import type TaskControl from "./TaskControl";
import { PrivateTaskOptionsSymbol } from "./TaskControl";

class TaskContext {
    private readonly taskControl: TaskControl;
    private readonly blaze: BlazeBuild;

    public constructor(blaze: BlazeBuild, taskControl: TaskControl) {
        this.blaze = blaze;
        this.taskControl = taskControl;
    }

    public addOutput(...files: string[]): void {
        this.taskControl[PrivateTaskOptionsSymbol].outputFilesAdd ??= [];
        this.taskControl[PrivateTaskOptionsSymbol].outputFilesAdd.push(
            ...files
        );
    }
}

export default TaskContext;
