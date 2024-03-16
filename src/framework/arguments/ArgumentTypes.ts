import { ArrayLike } from "../types/Utils";
import { ArgumentConstructor } from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

declare global {
    interface ArgumentRules {
        "range:min": number;
        "range:max": number;
        choices: string[];
    }
}

export type Rule = {
    value: unknown;
    message?: string;
    name: string;
    position: number;
    rules: ArgumentRules;
};

export type ArgumentTypeOptions = {
    types: Array<ArgumentConstructor> | ArgumentConstructor;
    optional?: boolean;
    default?: unknown;
    errorMessages?: {
        [key in ErrorType]?: string;
    };
    name: string;
    rules?: {
        [K in keyof ArgumentRules]?: ArgumentRules[K];
    };
};

export function ArgumentTypes(types: ArrayLike<ArgumentTypeOptions>) {
    return (target: object, _key?: unknown, _descriptor?: unknown) => {
        const arr: ArgumentTypeOptions[] = [];

        for (const index in types) {
            arr[index] = types[index];
        }

        Reflect.defineMetadata("command:types", arr, target);
    };
}

export function TakesArgument(type: ArgumentTypeOptions) {
    return (target: object, _key?: unknown, _descriptor?: unknown) => {
        const metadata =
            (Reflect.getMetadata("command:types", target) as ArgumentTypeOptions[] | undefined) ||
            [];
        metadata.unshift(type);
        Reflect.defineMetadata("command:types", metadata, target);
    };
}
