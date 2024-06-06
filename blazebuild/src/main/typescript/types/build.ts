import type Blaze from "../core/Blaze";
import type TaskManager from "../tasks/TaskManager";
import type { ProjectProperties } from "./project";

declare global {
    const blaze: Blaze;
    const tasks: TaskManager;
    const project: ProjectProperties & {
        setProperties(properties: Partial<ProjectProperties>): void;
    };

    function println(message: unknown): void;
}
