import BlazeError from "../errors/BlazeError";
import type AbstractTask from "./AbstractTask";

export const TASK_DEPENDENCY_GENERATOR_METADATA_KEY = "task.deps.generator";

export function TaskDependencyGenerator<R>(
    target: AbstractTask<R>,
    key: PropertyKey,
    _descriptor?: PropertyDescriptor
) {
    if (Reflect.hasOwnMetadata(TASK_DEPENDENCY_GENERATOR_METADATA_KEY, target)) {
        throw new BlazeError(
            "Cannot define multiple task dependency generators in the same class!"
        );
    }

    Reflect.defineMetadata(TASK_DEPENDENCY_GENERATOR_METADATA_KEY, key, target);
}
