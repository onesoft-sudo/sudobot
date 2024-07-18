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
import "reflect-metadata";

import type { ArgumentConstructor } from "@framework/arguments/Argument";
import { ErrorType } from "@framework/arguments/InvalidArgumentError";
import type InteractionContext from "@framework/commands/InteractionContext";
import type LegacyContext from "@framework/commands/LegacyContext";
import assert from "assert";
import type { ChatInputCommandInteraction } from "discord.js";

type ArgumentParserContext = LegacyContext | InteractionContext<ChatInputCommandInteraction>;

type ArgumentParserConfig = {
    context: ArgumentParserContext;
    schema: ArgumentParserSchema;
};

type ArgumentParserSchema = {
    overloads: ArgumentParserOverload[];
    options?: OptionSchema[];
};

type OptionSchema = {
    id: string;
    longNames?: string[];
    shortNames?: string[];
    required?: boolean;
    errors?: {
        [R in ErrorType.Required | ErrorType.InvalidOptionValue]: string;
    };
    requiresValue?: boolean;
    canonicalName?: string;
    canonicalNameType?: "long" | "short";
};

type ArgumentParserOverload = {
    name?: string;
    definitions: ArgumentParserDefinition[];
};

type ArgumentParserDefinition = {
    names: string[];
    types: ArgumentConstructor<unknown>[];
    optional?: boolean;
    errorMessages?: {
        [x in ErrorType]?: string;
    }[];
    rules?: ArgumentRules[];
    useCanonical?: boolean;
    interactionName?: string;
};

type CommonResult<T> = {
    error?: string;
    value?: T;
    errorType?: string;
};

type CommonArgs<T extends object> = T & {
    context: ArgumentParserContext;
    schema: ArgumentParserSchema;
};

type ParserGlobalState = {
    argIndex: number;
    definitionIndex: number;
    parsedArgs: Record<string, unknown>;
    parsedOptions: Record<string, unknown>;
};

class ArgumentParser {
    public async parse({ context, schema }: ArgumentParserConfig): Promise<
        CommonResult<NonNullable<Awaited<ReturnType<typeof this.parseOverload>>>["value"]> & {
            errors?: Record<string, string>;
        }
    > {
        let result: Awaited<ReturnType<typeof this.parseOverload>> | undefined;
        const errors: Record<string, string> = {};
        const parsedOptions: Record<string, unknown> = {};
        let index = 0;

        assert(schema.overloads.length > 0, "No overloads provided");

        for (const overload of schema.overloads) {
            result = await this.parseOverload({ context, overload, schema, parsedOptions });

            if (!result.error) {
                break;
            }

            errors[overload.name ?? index++] = result.error;
        }

        if (!result) {
            return {
                error: "The arguments did not satisfy any of the available overloads",
                errors
            };
        }

        if (result.error) {
            return {
                error: result.error,
                errorType: result.errorType,
                errors
            };
        }

        for (const optionSchema of schema.options ?? []) {
            if (!optionSchema.required) {
                continue;
            }

            if (!(optionSchema.id in parsedOptions)) {
                const optName =
                    optionSchema.canonicalName ??
                    optionSchema.longNames?.at(0) ??
                    optionSchema.shortNames?.at(0) ??
                    optionSchema.id;
                const optType =
                    optionSchema.canonicalNameType ??
                    (optionSchema.longNames?.at(0) || !optionSchema.shortNames?.at(0)
                        ? "long"
                        : "short");
                return {
                    error:
                        optionSchema.errors?.[ErrorType.Required] ??
                        `Option \`${optType === "long" ? "--" : "-"}${optName}\` is required`
                };
            }
        }

        return {
            value: result?.value,
            errors
        };
    }

    public async parseOverload({
        context,
        overload,
        schema,
        parsedOptions
    }: CommonArgs<{
        overload: ArgumentParserOverload;
        parsedOptions: Record<string, unknown>;
    }>): Promise<CommonResult<Pick<ParserGlobalState, "parsedArgs" | "parsedOptions">>> {
        console.log("Parsing overload", overload.name ?? "(unnamed)");
        console.log("---------------------");

        assert(overload.definitions.length > 0, "No definitions provided");

        const state: ParserGlobalState = {
            argIndex: 0,
            definitionIndex: 0,
            parsedArgs: {},
            parsedOptions
        };

        for (
            let definitionIndex = 0;
            definitionIndex < overload.definitions.length;
            definitionIndex++
        ) {
            const result = await this.parseArgumentDefinition({
                context,
                definition: overload.definitions[definitionIndex],
                schema,
                state
            });

            if (result.error) {
                return {
                    error: result.error,
                    errorType: "overload_exhausted"
                };
            }

            assert(result.value, "No value provided");
            state.parsedArgs[result.value.name] = result.value.value;

            if (result.abortParsingDefinitions) {
                break;
            }

            state.argIndex++;
        }

        return {
            value: { parsedArgs: state.parsedArgs, parsedOptions: state.parsedOptions }
        };
    }

    public async parseArgumentDefinition({
        context,
        definition,
        schema,
        state
    }: CommonArgs<{ definition: ArgumentParserDefinition; state: ParserGlobalState }>): Promise<
        CommonResult<{ name: string; value: unknown }> & {
            abortParsingDefinitions?: boolean;
        }
    > {
        let result: CommonResult<{ name: string; value: unknown }> | undefined;

        console.log("Parsing definition", definition.names);

        if (!schema.options) {
            assert(definition.types.length > 0, "No types provided");
            assert(definition.names.length > 0, "No names provided");
        } else if (context.isLegacy() && context.args[state.argIndex].startsWith("-")) {
            while (context.args[state.argIndex]?.startsWith("-")) {
                const { error, silent } = await this.parseOption({
                    context,
                    definition,
                    schema,
                    state
                });

                if (error) {
                    if (silent) {
                        continue;
                    }

                    return { error };
                }
            }
        }

        if (!definition.optional) {
            const errorMessageRecord = definition.errorMessages?.[0];
            const name = definition.names[definition.useCanonical ? 0 : state.definitionIndex];

            if (context.isLegacy() && context.args[state.argIndex] === undefined) {
                return {
                    error:
                        errorMessageRecord?.[ErrorType.Required] ??
                        `Argument at index #${state.argIndex} (${name}) is required but was not provided`
                };
            }

            const interactionName = definition.interactionName ?? name;

            if (!context.isLegacy() && !context.options.get(interactionName)) {
                return {
                    error:
                        errorMessageRecord?.[ErrorType.Required] ??
                        `Argument at index #${state.argIndex} (${interactionName}) is required but was not provided (via interaction)`
                };
            }
        }

        for (let typeIndex = 0; typeIndex < definition.types.length; typeIndex++) {
            result = await this.parseType({
                context,
                type: definition.types[typeIndex],
                typeIndex,
                schema,
                definition,
                state
            });

            if (!result.error) {
                return result;
            }
        }

        return {
            error: result?.error ?? "The arguments did not satisfy any of the available types",
            value: result?.value
        };
    }

    public async parseOption({
        context,
        schema,
        state
    }: CommonArgs<{ definition: ArgumentParserDefinition; state: ParserGlobalState }> & {
        context: LegacyContext;
    }): Promise<CommonResult<void> & { silent?: boolean }> {
        if (!schema.options) {
            return {
                error: "Options are not allowed"
            };
        }

        const isLong = context.args[state.argIndex].startsWith("--");
        const optArg = context.args[state.argIndex].slice(isLong ? 2 : 1);

        if (isLong) {
            const [name, immediateValue] = optArg.split(/=(.+)/);
            const optionSchema = schema.options.find(option => option.longNames?.includes(name));

            if (!optionSchema) {
                return {
                    error: `Unknown option \`--${name}\``
                };
            }

            if (name in state.parsedOptions) {
                state.argIndex++;

                if (optionSchema.requiresValue) {
                    state.argIndex++;
                }

                return {
                    error: `Option \`--${name}\` was already provided`,
                    silent: true
                };
            }

            const value =
                immediateValue ??
                (context.args[state.argIndex + 1]?.startsWith("-") === false
                    ? context.args[state.argIndex + 1]
                    : null);

            if (optionSchema.requiresValue) {
                if (value === null) {
                    return {
                        error: `Option \`--${name}\` requires a value`
                    };
                }

                state.parsedOptions[optionSchema.id] = value;
                state.argIndex++;
            } else {
                state.parsedOptions[optionSchema.id] = true;
            }

            state.argIndex++;
        } else {
            const optionNames = optArg.split("");
            let inc = 1;

            for (let optionIndex = 0; optionIndex < optionNames.length; optionIndex++) {
                const optionName = optionNames[optionIndex];
                const optionSchema = schema.options.find(schema =>
                    schema.shortNames?.includes(optionNames[optionIndex])
                );

                if (!optionSchema) {
                    return {
                        error: `Unknown option \`-${optionName}\``
                    };
                }

                if (optionName in state.parsedOptions) {
                    inc++;

                    if (optionSchema.requiresValue) {
                        inc++;
                    }

                    continue;
                }

                const isLast = optionNames.length - 1 === optionIndex;

                if (
                    (!isLast && optionSchema.requiresValue) ||
                    (isLast && context.args[state.argIndex + 1]?.startsWith("-") !== false)
                ) {
                    return {
                        error: `Option \`-${optionName}\` requires a value`
                    };
                }

                state.parsedOptions[optionSchema.id] = optionSchema.requiresValue
                    ? context.args[state.argIndex + 1]
                    : true;

                if (optionSchema.requiresValue) {
                    state.argIndex++;
                }
            }

            state.argIndex += inc;
        }

        return {
            value: undefined as void
        };
    }

    public async parseType({
        context,
        type,
        definition,
        state,
        typeIndex
    }: CommonArgs<{
        type: ArgumentConstructor<unknown>;
        definition: ArgumentParserDefinition;
        state: ParserGlobalState;
        typeIndex: number;
    }>): Promise<
        CommonResult<{ name: string; value: unknown }> & { abortParsingDefinitions?: boolean }
    > {
        const useCanonical = definition.useCanonical !== false && definition.names.length === 1;
        const name = definition.names[useCanonical ? 0 : state.definitionIndex];
        const errorMessageRecord = definition.errorMessages?.[useCanonical ? 0 : typeIndex];
        const rules = definition.rules?.[useCanonical ? 0 : typeIndex];

        try {
            const { abort, error, value } = context.isLegacy()
                ? await type.performCast(
                      context,
                      context.commandContent,
                      context.argv,
                      context.args[state.argIndex],
                      state.argIndex,
                      name,
                      rules,
                      !definition.optional
                  )
                : await type.performCastFromInteraction(
                      context,
                      context.commandMessage,
                      name,
                      rules,
                      !definition.optional
                  );

            if (error) {
                return { error: errorMessageRecord?.[error.meta.type] ?? error.message };
            }

            return {
                value: {
                    name,
                    value: value?.getValue()
                },
                abortParsingDefinitions: abort
            };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : `${error}`
            };
        }
    }
}

export default ArgumentParser;
