import BlazeError from "../errors/BlazeError";
import type AbstractTask from "./AbstractTask";

export const TASK_ACTION_METADATA_KEY = "task.action";

export function TaskAction<R>(
    target: AbstractTask<R>,
    key: PropertyKey,
    _descriptor?: PropertyDescriptor
) {
    if (Reflect.hasOwnMetadata(TASK_ACTION_METADATA_KEY, target)) {
        throw new BlazeError("Cannot define multiple task actions in the same class!");
    }

    Reflect.defineMetadata(TASK_ACTION_METADATA_KEY, key, target);
}
