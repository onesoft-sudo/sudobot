/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type {
    ArgumentParserDefinition,
    ArgumentParserSchema,
    OptionSchema
} from "@framework/arguments/ArgumentParser";

declare global {
    interface ArgumentRules {
        "range:min": number;
        "range:max": number;
        choices: string[];
        "interaction:no_required_check": boolean;
    }
}

export type ArgumentSchemaDecoratorType = ((config: ArgumentParserSchema) => ClassDecorator) & {
    Overload(definitions: ArgumentParserDefinition[]): ClassDecorator;
    Overload(name: string, definitions: ArgumentParserDefinition[]): ClassDecorator;
    Options(schemas: OptionSchema[]): ClassDecorator;
    Definition<T extends Record<string, unknown> = Record<string, unknown>>(
        definition: ArgumentParserDefinition<T>
    ): ClassDecorator;
};

export const ArgumentSchema: ArgumentSchemaDecoratorType = (
    config: ArgumentParserSchema
): ClassDecorator => {
    return target => Reflect.defineMetadata("command:schema", config, target);
};

ArgumentSchema.Overload = (
    nameOrDefinitions: string | ArgumentParserDefinition[],
    definitions?: ArgumentParserDefinition[]
): ClassDecorator => {
    const finalDefs = typeof nameOrDefinitions === "string" ? definitions : nameOrDefinitions;
    const name = typeof nameOrDefinitions === "string" ? nameOrDefinitions : undefined;

    return target => {
        const metadata =
            (Reflect.getMetadata("command:schema", target) as ArgumentParserSchema) ?? {};

        metadata.overloads ??= [];
        metadata.overloads?.unshift({ name, definitions: finalDefs ?? [] });

        Reflect.defineMetadata("command:schema", metadata, target);
    };
};

ArgumentSchema.Definition = <
    T extends Record<string, unknown> = Record<string, unknown>,
    K extends [keyof T, ...(keyof T)[]] = [keyof T, ...(keyof T)[]]
>(
    definition: ArgumentParserDefinition<T, K>
): ClassDecorator => {
    return target => {
        const metadata =
            (Reflect.getMetadata("command:schema", target) as ArgumentParserSchema) ?? {};

        metadata.overloads ??= [];

        const existingDefs = metadata.overloads?.[0]?.definitions ?? [];
        existingDefs?.unshift(definition as ArgumentParserDefinition);

        if (metadata.overloads.length === 0) {
            metadata.overloads.unshift({ definitions: existingDefs });
        } else {
            metadata.overloads[0].definitions = existingDefs;
        }

        Reflect.defineMetadata("command:schema", metadata, target);
    };
};

ArgumentSchema.Options = (schemas: OptionSchema[]): ClassDecorator => {
    return target => {
        const metadata =
            (Reflect.getMetadata("command:schema", target) as ArgumentParserSchema) ?? {};

        metadata.options ??= [];
        metadata.options?.unshift(...schemas);

        Reflect.defineMetadata("command:schema", metadata, target);
    };
};

// HACK: This needs to be removed
export const TakesArgument = () => {
    return () => void 0;
};
