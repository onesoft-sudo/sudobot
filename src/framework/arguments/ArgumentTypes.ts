import { requireNonNull } from "../utils/utils";
import { ArgumentConstructor } from "./Argument";
import { ErrorType } from "./InvalidArgumentError";

declare global {
    interface ArgumentRules {
        "range:min": number;
        "range:max": number;
        choices: string[];
        "interaction:no_required_check": boolean;
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
    interactionType?: ArgumentConstructor<T>;
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

export type ArgumentOptionsFor<T, N extends keyof T = keyof T> = {
    [K in N]: ArgumentTypeOptions<T[K], K extends string ? K : never>;
}[N];

export type ArrayOfArguments<T> = {
    [K: number]: {
        [K in keyof T]: ArgumentTypeOptions<T[K], K extends string ? K : never>;
    }[keyof T];
};

export function ArgumentTypes<T = Record<string, unknown>>(types: ArrayOfArguments<T>) {
    return (target: object, _key?: unknown, _descriptor?: unknown) => {
        const arr: ArgumentTypeOptions[] = [];

        for (const index in types) {
            arr[index] = types[index];
        }

        Reflect.defineMetadata("command:types", arr, target);
    };
}

export function TakesArgument<T, N extends keyof T = keyof T>(
    type: ArgumentOptionsFor<T, N>
): ClassDecorator & MethodDecorator;

export function TakesArgument<
    T,
    N extends keyof T = keyof T,
    _O extends ArgumentOptionsFor<T, N> = ArgumentOptionsFor<T, N>
>(
    name: _O["name"],
    types: _O["types"],
    optional?: _O["optional"],
    errors?: _O["errorMessages"]
): ClassDecorator & MethodDecorator;

export function TakesArgument<
    T,
    N extends keyof T = keyof T,
    _O extends ArgumentOptionsFor<T, N> = ArgumentOptionsFor<T, N>
>(
    typeOrName: _O | _O["name"],
    types?: _O["types"],
    optional?: _O["optional"],
    errors?: _O["errorMessages"]
) {
    return (target: object, _key?: unknown, _descriptor?: unknown) => {
        const metadata =
            (Reflect.getMetadata("command:types", target) as ArgumentTypeOptions[] | undefined) ||
            [];

        metadata.unshift(
            typeof typeOrName === "string"
                ? {
                      name: typeOrName,
                      types: requireNonNull(types),
                      optional: optional,
                      errorMessages: errors
                  }
                : typeOrName
        );

        Reflect.defineMetadata("command:types", metadata, target);
    };
}
