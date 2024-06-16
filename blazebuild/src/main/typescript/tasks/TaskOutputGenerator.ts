import BlazeError from "../errors/BlazeError";
import type AbstractTask from "./AbstractTask";

export const TASK_OUTPUT_GENERATOR_METADATA_KEY = "task.output.generator";

export function TaskOutputGenerator<R>(
    target: AbstractTask<R>,
    key: PropertyKey,
    _descriptor?: PropertyDescriptor
) {
    if (Reflect.hasOwnMetadata(TASK_OUTPUT_GENERATOR_METADATA_KEY, target)) {
        throw new BlazeError("Cannot define multiple task output generators in the same class!");
    }

    Reflect.defineMetadata(TASK_OUTPUT_GENERATOR_METADATA_KEY, key, target);
}
