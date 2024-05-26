import type Blaze from "../core/Blaze";
import type TaskManager from "../tasks/TaskManager";

declare global {
    const blaze: Blaze;
    const tasks: TaskManager;
}
