/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2024 OSN Developers.
 *
 * SudoBot is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SudoBot is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
 */

import { requireNonNull } from "../utils/utils";
import type { ArgumentConstructor } from "./Argument";
import type { ErrorType } from "./InvalidArgumentError";

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

export type ArgumentTypeOptions<T = unknown, N extends string[] = string[]> = {
    types: Array<ArgumentConstructor<T>> | ArgumentConstructor<T>;
    interactionType?: ArgumentConstructor<T>;
    interactionName?: string;
    optional?: boolean;
    default?: unknown;
    errorMessages?: Array<{
        [key in ErrorType]?: string;
    }>;
    names: N;
    rules?: {
        [K in keyof ArgumentRules]?: ArgumentRules[K];
    };
};

export type ArgumentOptionsFor<T> = {
    [K in keyof T]: ArgumentTypeOptions<T[K]>;
}[keyof T];

export type ArrayOfArguments<T> = {
    [K: number]: {
        [K in keyof T]: ArgumentTypeOptions<T[K], K extends string ? K[] : never>;
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

export function TakesArgument<T>(
    type: ArgumentTypeOptions<T[keyof T]>
): ClassDecorator & MethodDecorator;

export function TakesArgument<T, _O extends ArgumentOptionsFor<T> = ArgumentOptionsFor<T>>(
    names: _O["names"],
    types: _O["types"],
    optional?: _O["optional"],
    errors?: _O["errorMessages"][]
): ClassDecorator & MethodDecorator;

export function TakesArgument<T, _O extends ArgumentOptionsFor<T> = ArgumentOptionsFor<T>>(
    typeOrName: _O | _O["names"],
    types?: _O["types"],
    optional?: _O["optional"],
    errors?: NonNullable<_O["errorMessages"]>[]
) {
    return (target: object, _key?: unknown, _descriptor?: unknown) => {
        const metadata =
            (Reflect.getMetadata("command:types", target) as ArgumentTypeOptions[] | undefined) ||
            [];

        metadata.unshift(
            (Array.isArray(typeOrName) && typeof typeOrName[0] === "string") ||
                typeof typeOrName === "string"
                ? {
                      names: Array.isArray(typeOrName) ? typeOrName : ([typeOrName] as string[]),
                      types: requireNonNull(types),
                      optional: optional,
                      errorMessages: (errors as ArgumentTypeOptions["errorMessages"]) ?? []
                  }
                : (typeOrName as _O)
        );

        Reflect.defineMetadata("command:types", metadata, target);
    };
}
