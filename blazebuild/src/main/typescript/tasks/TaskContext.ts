import type BlazeBuild from "../core/BlazeBuild.ts";
import type TaskControl from "./TaskControl.ts";
import { PrivateTaskOptionsSymbol } from "./TaskControl.ts";

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
