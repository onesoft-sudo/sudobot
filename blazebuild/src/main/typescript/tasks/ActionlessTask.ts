import type AbstractTask from "./AbstractTask";

export const ACTIONLESS_TASK_METADATA_KEY = "task.is_actionless";

export function ActionlessTask<R>(target: typeof AbstractTask<R>) {
    Reflect.defineMetadata(ACTIONLESS_TASK_METADATA_KEY, true, target);
}
