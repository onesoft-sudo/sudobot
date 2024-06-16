import BlazeError from "../errors/BlazeError";
import type AbstractTask from "./AbstractTask";

export const TASK_INPUT_GENERATOR_METADATA_KEY = "task.input.generator";

export function TaskInputGenerator<R>(
    target: AbstractTask<R>,
    key: PropertyKey,
    _descriptor?: PropertyDescriptor
) {
    if (Reflect.hasOwnMetadata(TASK_INPUT_GENERATOR_METADATA_KEY, target)) {
        throw new BlazeError("Cannot define multiple task input generators in the same class!");
    }

    Reflect.defineMetadata(TASK_INPUT_GENERATOR_METADATA_KEY, key, target);
}
