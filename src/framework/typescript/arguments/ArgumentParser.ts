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

import Application from "@framework/app/Application";
import type { ArgumentConstructor } from "@framework/arguments/Argument";
import { ErrorType, InvalidArgumentError } from "@framework/arguments/InvalidArgumentError";
import type { Command } from "@framework/commands/Command";
import type InteractionContext from "@framework/commands/InteractionContext";
import type LegacyContext from "@framework/commands/LegacyContext";
import assert from "assert";
import type { ChatInputCommandInteraction } from "discord.js";

type ArgumentParserContext = LegacyContext | InteractionContext<ChatInputCommandInteraction>;

type ArgumentParserConfig = {
    context: ArgumentParserContext;
    command: Command;
    schema: ArgumentParserSchema;
    parseSubCommand?: boolean;
};

export type ArgumentParserSchema = {
    overloads?: ArgumentParserOverload[];
    options?: OptionSchema[];
};

export type OptionSchema = {
    id: string;
    longNames?: string[];
    shortNames?: string[];
    required?: boolean;
    errors?: {
        [R in ErrorType.Required | ErrorType.OptionRequiresValue]: string;
    };
    requiresValue?: boolean;
    canonicalName?: string;
    canonicalNameType?: "long" | "short";
};

export type ArgumentParserOverload = {
    name?: string;
    definitions: ArgumentParserDefinition[];
};

export type ArgumentParserDefinition<
    T extends Record<string, unknown> = Record<string, unknown>,
    K extends [keyof T, ...(keyof T)[]] = [keyof T, ...(keyof T)[]]
> = {
    names: K;
    types: {
        [M in Extract<keyof T, number>]: ArgumentConstructor<T[M]>;
    } & {
        length: number;
        [key: number]: ArgumentConstructor<unknown>;
    };
    optional?: boolean;
    errorMessages?: {
        [x in ErrorType]?: string;
    }[];
    rules?: Partial<ArgumentRules>[];
    useCanonical?: boolean;
    interactionName?: string;
    interactionType?: ArgumentConstructor<unknown>;
    interactionRuleIndex?: number;
};

type CommonResult<T> = {
    errorTypeForwarded?: ErrorType;
    error?: string;
    value?: T;
    errorType?: string;
    abort?: boolean;
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
    skipIndexes: number[];
};

class ArgumentParser {
    public async parse({
        throwOnError = false,
        ...args
    }: Omit<ArgumentParserConfig, "schema"> & { throwOnError?: boolean }): Promise<
        CommonResult<NonNullable<Awaited<ReturnType<typeof this.parseOverload>>>["value"]> & {
            errors?: Record<string, [ErrorType | undefined, string]>;
        }
    > {
        const result = await this.parseInternal(args);

        if (throwOnError && result.error) {
            throw new InvalidArgumentError(result.error, {
                type: result.errorTypeForwarded
            });
        }

        return result;
    }

    public async parseInternal({
        context,
        command,
        parseSubCommand = false
    }: Omit<ArgumentParserConfig, "schema">): Promise<
        CommonResult<NonNullable<Awaited<ReturnType<typeof this.parseOverload>>>["value"]> & {
            errors?: Record<string, [ErrorType | undefined, string]>;
        }
    > {
        let result: Awaited<ReturnType<typeof this.parseOverload>> | undefined;
        const errors: Record<string, [ErrorType | undefined, string]> = {};
        const parsedOptions: Record<string, unknown> = {};
        let index = 0;
        let subcommandParseResult: Awaited<ReturnType<typeof this.parseSubcommand>> | undefined;
        const baseSchema = (Reflect.getMetadata("command:schema", command.constructor) as
            | ArgumentParserSchema
            | undefined) ?? {
            overloads: []
        };

        if (parseSubCommand) {
            subcommandParseResult = await this.parseSubcommand({
                context,
                command,
                schema: baseSchema
            });
        }

        if (subcommandParseResult && subcommandParseResult.abort) {
            return { abort: true };
        }

        if (subcommandParseResult && subcommandParseResult.error) {
            return {
                error: subcommandParseResult.error,
                errorType: subcommandParseResult.errorType
            };
        }

        const schema =
            (subcommandParseResult?.value
                ? ((Reflect.getMetadata(
                      "command:schema",
                      subcommandParseResult.value.constructor
                  ) as ArgumentParserSchema | undefined) ?? {
                      overloads: []
                  })
                : null) ?? baseSchema;

        if (!schema.overloads?.length) {
            return {
                value: {
                    parsedArgs: {},
                    parsedOptions: {}
                }
            };
        }

        for (const overload of schema.overloads) {
            result = await this.parseOverload({
                context,
                overload,
                schema,
                parsedOptions,
                command,
                skipIndexes: [],
                defaultState: subcommandParseResult?.defaultState
            });

            if (!result.error) {
                break;
            }

            errors[overload.name ?? index++] = [result.errorTypeForwarded, result.error];
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
                errors,
                errorTypeForwarded: result.errorTypeForwarded
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
                        `Option \`${optType === "long" ? "--" : "-"}${optName}\` is required`,
                    errorTypeForwarded: ErrorType.Required
                };
            }
        }

        return {
            value: result?.value,
            errors,
            errorTypeForwarded: result?.errorTypeForwarded
        };
    }

    private async parseSubcommand({ context, command, schema }: ArgumentParserConfig): Promise<
        CommonResult<Command | null> & {
            defaultState?: ParserGlobalState;
        }
    > {
        if (!command.hasSubcommands) {
            return { value: null };
        }

        const { commandName } = context;
        let subcommandName = context.isLegacy() ? undefined : context.options.getSubcommand(true);
        const state: ParserGlobalState = {
            argIndex: 0,
            definitionIndex: 0,
            parsedArgs: {},
            parsedOptions: {},
            skipIndexes: []
        };

        if (context.isLegacy()) {
            while (context.args[state.argIndex]?.startsWith("-")) {
                const { error, silent, errorType } = await this.parseOption({
                    context,
                    schema,
                    state
                });

                if (error) {
                    if (silent) {
                        continue;
                    }

                    if (errorType === "option_not_allowed") {
                        return {
                            error: "Options are not allowed to be used with this command, before subcommand name!"
                        };
                    }

                    return { error };
                }
            }

            subcommandName = context.args[state.argIndex++];
        }

        const onSubcommandNotFoundHandler =
            command.onSubcommandNotFound?.bind(command) ??
            Reflect.getMetadata("command:subcommand_not_found_error", command.constructor);

        if (!subcommandName) {
            if (typeof onSubcommandNotFoundHandler === "function") {
                try {
                    await onSubcommandNotFoundHandler(context, undefined, "not_specified");
                } catch (error) {
                    Application.current().logger.error(error);
                }

                return {
                    abort: true
                };
            }

            return {
                error: `A subcommand is required! The valid subcommands are: \`${command.subcommands.join("`, `")}\`.`
            };
        }

        if (!command.subcommands.includes(subcommandName)) {
            if (typeof onSubcommandNotFoundHandler === "function") {
                try {
                    await onSubcommandNotFoundHandler(context, subcommandName, "not_found");
                } catch (error) {
                    Application.current().logger.error(error);
                }

                return {
                    abort: true
                };
            }

            return {
                error: `\`${subcommandName}\` is not a valid subcommand for \`${commandName}\`. The valid subcommands are: \`${command.subcommands.join("`, `")}\`.`
            };
        }

        const commandManager = Application.current().service("commandManager");
        const canonicalName = commandManager.getCommand(commandName)?.name ?? commandName;
        const baseCommand = commandManager.getCommand(canonicalName);

        const subcommand =
            baseCommand && baseCommand.isolatedSubcommands === false
                ? baseCommand
                : commandManager.getCommand(`${canonicalName}::${subcommandName}`);

        if (!subcommand) {
            if (typeof onSubcommandNotFoundHandler === "function") {
                await onSubcommandNotFoundHandler(context, subcommandName, "not_found");

                return {
                    abort: true
                };
            }

            return {
                error: `\`${subcommandName}\` is not a valid subcommand for \`${commandName}\`. The valid subcommands are: \`${command.subcommands.join("`, `")}\`.`
            };
        }

        return {
            value: subcommand,
            defaultState: context.isLegacy()
                ? {
                      ...state,
                      parsedArgs: {}
                  }
                : undefined
        };
    }

    private nextArgIndex(state: ParserGlobalState, inc = 1) {
        if (state.skipIndexes.includes(state.argIndex)) {
            state.argIndex++;
        }

        state.argIndex += inc;
        return state.argIndex;
    }

    public async parseOverload({
        context,
        overload,
        schema,
        parsedOptions,
        command,
        skipIndexes = [],
        defaultState
    }: CommonArgs<{
        overload: ArgumentParserOverload;
        parsedOptions: Record<string, unknown>;
        command: Command;
        skipIndexes?: number[];
        defaultState?: ParserGlobalState;
    }>): Promise<
        CommonResult<Pick<ParserGlobalState, "parsedArgs" | "parsedOptions">> & {
            errorTypeForwarded?: ErrorType;
        }
    > {
        Application.current().logger.debug("Parsing overload", overload.name ?? "(unnamed)");
        Application.current().logger.debug("---------------------");

        assert(overload.definitions.length > 0, "No definitions provided");

        const state: ParserGlobalState = defaultState
            ? { ...defaultState }
            : {
                  argIndex: 0,
                  definitionIndex: 0,
                  parsedArgs: {},
                  parsedOptions,
                  skipIndexes
              };

        Application.current().logger.debug("Initial state", defaultState);

        for (
            let definitionIndex = 0;
            definitionIndex < overload.definitions.length;
            definitionIndex++
        ) {
            const result = await this.parseArgumentDefinition({
                context,
                definition: overload.definitions[definitionIndex],
                schema,
                state,
                command
            });

            if (result.error) {
                return {
                    error: result.error,
                    errorType: "definition_parse_failed",
                    errorTypeForwarded: result.errorTypeForwarded
                };
            }

            assert(result.value, "No value provided");
            state.parsedArgs[result.value.name] ??= result.value.value;

            if (result.abortParsingDefinitions) {
                break;
            }

            this.nextArgIndex(state);
        }

        return {
            value: { parsedArgs: state.parsedArgs, parsedOptions: state.parsedOptions }
        };
    }

    public async parseArgumentDefinition({
        context,
        definition,
        schema,
        state,
        command
    }: CommonArgs<{
        definition: ArgumentParserDefinition;
        state: ParserGlobalState;
        command: Command;
    }>): Promise<
        CommonResult<{ name: string; value: null | unknown }> & {
            abortParsingDefinitions?: boolean;
            errorTypeForwarded?: ErrorType;
        }
    > {
        let result: CommonResult<{ name: string; value: unknown }> | undefined;

        Application.current().logger.debug("Parsing definition", definition.names);

        if (!schema.options) {
            assert(definition.types.length > 0, "No types provided");
            assert(definition.names.length > 0, "No names provided");
        } else if (context.isLegacy() && context.args[state.argIndex]?.startsWith("-")) {
            while (context.args[state.argIndex]?.startsWith("-")) {
                const { error, silent } = await this.parseOption({
                    context,
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

        const errorMessageRecord = definition.errorMessages?.[0];

        if (context.isLegacy() && context.args[state.argIndex] === undefined) {
            if (definition.optional) {
                return {
                    value: {
                        name: definition.names[0],
                        value: null
                    }
                };
            }

            return {
                errorTypeForwarded: ErrorType.Required,
                error:
                    errorMessageRecord?.[ErrorType.Required] ??
                    `Argument at index #${state.argIndex} (${definition.names.join(", ")}) is required but was not provided`
            };
        }

        const interactionName = definition.interactionName ?? definition.names[0];

        if (!context.isLegacy() && !context.options.get(interactionName)) {
            if (definition.optional) {
                return {
                    value: {
                        name: interactionName,
                        value: null
                    }
                };
            }

            return {
                errorTypeForwarded: ErrorType.Required,
                error:
                    errorMessageRecord?.[ErrorType.Required] ??
                    `Argument at index #${state.argIndex} (${interactionName}) is required but was not provided (via interaction)`
            };
        }

        for (let typeIndex = 0; typeIndex < definition.types.length; typeIndex++) {
            result = await this.parseType({
                context,
                type:
                    (context.isChatInput() ? definition.interactionType : null) ??
                    definition.types[typeIndex],
                typeIndex,
                schema,
                definition,
                state,
                command
            });

            if (!result.error) {
                return result;
            }

            if (context.isChatInput() && definition.interactionType) {
                break;
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
    }: CommonArgs<{
        state: ParserGlobalState;
    }> & {
        context: LegacyContext;
    }): Promise<CommonResult<void> & { silent?: boolean }> {
        if (!schema.options) {
            return {
                error: "Options are not allowed",
                errorType: "option_not_allowed"
            };
        }

        assert(!!context.args[state.argIndex]);

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
                this.nextArgIndex(state);

                if (optionSchema.requiresValue) {
                    this.nextArgIndex(state);
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
                        errorTypeForwarded: ErrorType.OptionRequiresValue,
                        error:
                            optionSchema.errors?.[ErrorType.OptionRequiresValue] ??
                            `Option \`--${name}\` requires a value`
                    };
                }

                state.parsedOptions[optionSchema.id] = value;
                this.nextArgIndex(state);
            } else {
                state.parsedOptions[optionSchema.id] = true;
            }

            this.nextArgIndex(state);
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
                        errorTypeForwarded: ErrorType.OptionRequiresValue,
                        error:
                            optionSchema.errors?.[ErrorType.OptionRequiresValue] ??
                            `Option \`-${optionName}\` requires a value`
                    };
                }

                state.parsedOptions[optionSchema.id] = optionSchema.requiresValue
                    ? context.args[state.argIndex + 1]
                    : true;

                if (optionSchema.requiresValue) {
                    this.nextArgIndex(state);
                }
            }

            this.nextArgIndex(state, inc);
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
        command: Command;
    }>): Promise<
        CommonResult<{ name: string; value: unknown }> & { abortParsingDefinitions?: boolean }
    > {
        const useCanonical = definition.useCanonical !== false && definition.names.length === 1;
        const name = definition.names[useCanonical ? 0 : typeIndex];
        const errorMessageRecord = definition.errorMessages?.[useCanonical ? 0 : typeIndex];
        const rules =
            definition.rules?.[
                (context.isChatInput() ? definition.interactionRuleIndex : null) ??
                    (useCanonical ? 0 : typeIndex)
            ];

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
                return {
                    error:
                        (error.meta.type ? errorMessageRecord?.[error.meta.type] : null) ??
                        error.message,
                    errorTypeForwarded: error.meta.type
                };
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
