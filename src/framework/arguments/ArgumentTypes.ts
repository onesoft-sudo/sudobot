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

export type ArgumentTypeOptions<T = unknown, N extends string = string> = {
    types: Array<ArgumentConstructor<T>> | ArgumentConstructor<T>;
    optional?: boolean;
    default?: unknown;
    errorMessages?: {
        [key in ErrorType]?: string;
    };
    name: N;
    rules?: {
        [K in keyof ArgumentRules]?: ArgumentRules[K];
    };
};

export type ArrayOfArguments<T extends Record<string, unknown>> = {
    [K: number]: {
        [K in keyof T]: ArgumentTypeOptions<T[K], K extends string ? K : never>;
    }[keyof T];
};

export function ArgumentTypes<T extends Record<string, unknown> = Record<string, unknown>>(
    types: ArrayOfArguments<T>
) {
    return (target: object, _key?: unknown, _descriptor?: unknown) => {
        const arr: ArgumentTypeOptions[] = [];

        for (const index in types) {
            arr[index] = types[index];
        }

        Reflect.defineMetadata("command:types", arr, target);
    };
}

export function TakesArgument<T extends Record<string, unknown>, N extends keyof T = keyof T>(
    type: {
        [K in N]: ArgumentTypeOptions<T[K], K extends string ? K : never>;
    }[N]
) {
    return (target: object, _key?: unknown, _descriptor?: unknown) => {
        const metadata =
            (Reflect.getMetadata("command:types", target) as ArgumentTypeOptions[] | undefined) ||
            [];
        metadata.unshift(type);
        Reflect.defineMetadata("command:types", metadata, target);
    };
}
