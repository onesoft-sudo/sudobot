/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import type Application from "@framework/app/Application.js";
import RestArgument from "@framework/arguments/RestArgument.js";
import type InteractionContext from "@framework/commands/InteractionContext.js";
import type LegacyContext from "@framework/commands/LegacyContext.js";
import type { ChatInputCommandInteraction } from "discord.js";
import ArgumentParseError from "./ArgumentParseError.js";
import type { ArgumentParserSchema } from "./ArgumentSchema.js";
import { type ArgumentDefinition, type ArgumentOverload, type ArgumentOverloadExtended } from "./ArgumentSchema.js";
import { ArgumentErrorType, InvalidArgumentError } from "./InvalidArgumentError.js";

type ParserContext = {
    args: readonly string[];
    index: number;
    context: LegacyContext | InteractionContext;
    schema: ArgumentParserSchema;
    isInteractive: boolean;
    abortOptionParsing: boolean;
};

type ParseStepResult<T extends object = Record<never, never>> = T & {
    error?: string;
};

class ArgumentParser {
    protected readonly application: Application;

    public constructor(application: Application) {
        this.application = application;
    }

    protected async parseFromInteraction(
        context: InteractionContext,
        schema: ArgumentParserSchema
    ): Promise<{
        args?: Record<string, unknown>;
        options?: Record<string, string | readonly string[] | null>;
        overloadIndex?: number;
        errors?: string[];
    }> {
        const { overloads } = schema;
        const parserContext: ParserContext = {
            args: [],
            context,
            schema,
            index: 0,
            isInteractive: true,
            abortOptionParsing: false
        };
        const errors = [];
        const overload = overloads[schema.defaultIndex ?? 0];

        tryBlock: try {
            const result = await this.parseOverload(parserContext, overload);

            if (result.error) {
                errors.push(result.error);
                break tryBlock;
            }

            return { args: result.args, options: result.options, overloadIndex: schema.defaultIndex ?? 0 };
        } catch (error) {
            if (error instanceof ArgumentParseError || error instanceof InvalidArgumentError) {
                errors.push(error.message);
            } else {
                throw error;
            }
        }

        return {
            errors
        };
    }

    protected async parseFromLegacy(
        context: LegacyContext,
        schema: ArgumentParserSchema
    ): Promise<{
        args?: Record<string, unknown>;
        options?: Record<string, string | readonly string[] | null>;
        overloadIndex?: number;
        errors?: string[];
    }> {
        const { overloads } = schema;
        const errors = [];

        for (let i = 0; i < overloads.length; i++) {
            const parserContext: ParserContext = {
                args: context.args,
                context,
                schema,
                index: 0,
                isInteractive: false,
                abortOptionParsing: false
            };
            const overload = overloads[i];

            try {
                const result = await this.parseOverload(parserContext, overload);

                if (result.error) {
                    errors.push(result.error);
                    continue;
                }

                return { args: result.args, options: result.options, overloadIndex: i };
            } catch (error) {
                if (error instanceof ArgumentParseError || error instanceof InvalidArgumentError) {
                    errors.push(error.message);
                    continue;
                }

                throw error;
            }
        }

        return {
            errors
        };
    }

    protected async parseOverload(
        parserContext: ParserContext,
        overload: ArgumentOverloadExtended
    ): Promise<
        ParseStepResult<{
            args?: Record<string, unknown>;
            options?: Record<string, string | readonly string[] | null>;
        }>
    > {
        const args: Record<string, unknown> = Object.create(null);
        const options: Record<string, string | readonly string[] | null> = Object.create(null);

        for (const definition of overload.definitions) {
            const result = await this.parseDefinition(parserContext, overload, definition, options);

            if (result.error) {
                parserContext.index = 0;
                return result;
            }

            args[definition.name] = result.value;
            parserContext.index++;

            if (result.break) {
                break;
            }
        }

        return {
            args,
            options
        };
    }

    protected async parseDefinition(
        parserContext: ParserContext,
        overload: ArgumentOverloadExtended,
        definition: ArgumentDefinition,
        outOptions: Record<string, string | readonly string[] | null>
    ): Promise<ParseStepResult<{ value?: unknown; break?: boolean }>> {
        let done = true;
        let lastError: ArgumentParseError | InvalidArgumentError | string | undefined;
        const options: Record<string, string | readonly string[] | null> = Object.create(null);

        outer: do {
            const rawValue = parserContext.context.isInteractive()
                ? parserContext.context.commandMessage.options.get(definition.interactionName ?? definition.name)
                : parserContext.args[parserContext.index];

            if (!rawValue) {
                if (definition.isOptional) {
                    return { value: null };
                }

                return {
                    error:
                        definition.errorMessages?.[ArgumentErrorType.Required] ??
                        `Argument '${(parserContext.context.isInteractive() ? definition.interactionName : null) ?? definition.name}' is required`
                };
            }

            const types = Array.isArray(definition.type)
                ? parserContext.isInteractive
                    ? [definition.type[definition.defaultIndex ?? 0]]
                    : definition.type
                : [definition.type];

            typeLoop: for (let i = 0; i < types.length; i++) {
                const type = types[i];

                if (!parserContext.isInteractive && parserContext.args[parserContext.index][0] === "-") {
                    if (type.prototype instanceof RestArgument) {
                        parserContext.abortOptionParsing = true;
                    } else if (parserContext.args[parserContext.index] === "--") {
                        parserContext.abortOptionParsing = true;
                        parserContext.index++;
                        done = false;
                        continue outer;
                    } else {
                        const isLongOption = parserContext.args[parserContext.index][1] === "-";
                        const equalPosition = isLongOption ? parserContext.args[parserContext.index].indexOf("=") : -1;
                        const optionStrings = isLongOption
                            ? [parserContext.args[parserContext.index].substring(2)]
                            : parserContext.args[parserContext.index].substring(1).split("");

                        for (let j = 0; j < optionStrings.length; j++) {
                            const optionString = optionStrings[j];
                            const optionName = optionString
                                .substring(
                                    0,
                                    equalPosition === -1 ? undefined : equalPosition - 1 - (isLongOption ? 1 : 0)
                                )
                                .toLowerCase();

                            const optionSchema = overload.optionsPlainMap?.[optionName];

                            if (!optionSchema) {
                                lastError = `Invalid option '${isLongOption ? "--" : "-"}${optionName}'.`;
                                continue typeLoop;
                            }

                            let optionArgument: string | null = null;

                            if (optionSchema.argument) {
                                if (j !== optionStrings.length - 1) {
                                    lastError = `Option '${isLongOption ? "--" : "-"}${optionName}' cannot accept an argument in condensed form. Please pass it seperately.`;
                                    continue typeLoop;
                                }

                                optionArgument =
                                    equalPosition === -1
                                        ? parserContext.args[parserContext.index + 1]
                                        : parserContext.args[parserContext.index].substring(equalPosition + 1);

                                if (!optionArgument) {
                                    lastError = `Option '${isLongOption ? "--" : "-"}${optionName}' requires an argument.`;
                                    continue typeLoop;
                                }

                                parserContext.index++;
                            } else if (equalPosition !== -1) {
                                lastError = `Option '${isLongOption ? "--" : "-"}${optionName}' cannot accept arguments.`;
                                continue typeLoop;
                            }

                            if (optionSchema.multiple && optionArgument) {
                                if (Array.isArray(options[optionSchema.canonicalName])) {
                                    (options[optionSchema.canonicalName] as Array<string>)?.push(optionArgument);
                                } else if (optionArgument) {
                                    options[optionSchema.canonicalName] = [optionArgument];
                                }
                            } else {
                                if (optionSchema.canonicalName in options) {
                                    lastError = `Cannot accept '${isLongOption ? "--" : "-"}${optionName}' multiple times.`;
                                    continue typeLoop;
                                }

                                options[optionSchema.canonicalName] = optionArgument ?? "yes";
                            }
                        }

                        parserContext.index++;
                    }
                } else if (parserContext.isInteractive && overload.options) {
                    for (const optionName in overload.options) {
                        const value = overload.options?.[optionName].argument
                            ? (parserContext.context.commandMessage as ChatInputCommandInteraction).options.getString(
                                  optionName
                              )
                            : (parserContext.context.commandMessage as ChatInputCommandInteraction).options.getBoolean(
                                    optionName
                                )
                              ? "yes"
                              : null;

                        options[optionName] = value;
                    }
                }

                try {
                    const argument = parserContext.isInteractive
                        ? await type.createFromInteraction({
                              application: this.application,
                              context: parserContext.context as InteractionContext,
                              definition,
                              name: definition.interactionName ?? definition.name,
                              index: parserContext.index,
                              typeIndex: i
                          })
                        : await type.createFromLegacy({
                              application: this.application,
                              context: parserContext.context as LegacyContext,
                              definition,
                              argument: parserContext.args[parserContext.index],
                              index: parserContext.index,
                              typeIndex: i
                          });

                    const value = argument.getValue();
                    Object.assign(outOptions, options);
                    return { value, break: argument.abortAfterParsing };
                } catch (error) {
                    if (error instanceof ArgumentParseError || error instanceof InvalidArgumentError) {
                        lastError = error;
                        continue;
                    }

                    throw error;
                }
            }
        } while (!done);

        return {
            error: lastError
                ? typeof lastError === "string"
                    ? lastError
                    : lastError.message ||
                      (lastError instanceof InvalidArgumentError && lastError.meta.type !== undefined
                          ? definition.errorMessages?.[lastError.meta.type]
                          : "Unknown error")
                : "Invalid parser state: No types to parse or no value could be computed"
        };
    }

    public async parse(context: LegacyContext | InteractionContext, schema: ArgumentParserSchema) {
        const result = context.isInteractive()
            ? await this.parseFromInteraction(context, schema)
            : await this.parseFromLegacy(context, schema);

        return {
            errors: result.errors,
            args: result.args,
            options: result.options
        };
    }

    public overloadSignatureToString(overload: ArgumentOverload) {
        let str = "";

        for (const [name, option] of Object.entries(overload.options ?? {})) {
            str += `[${option.short ? `-${option.short}|` : ""}--${name}${option.argument ? "=VALUE" : ""}] `;
        }

        for (const def of overload.definitions) {
            let typeString = "";

            if (Array.isArray(def.type)) {
                for (const type of def.type) {
                    typeString += `${typeString === "" ? "" : " | "}${type.name}`;
                }
            } else {
                typeString = def.type.name;
            }

            str += `${def.isOptional ? "[" : "<"}${def.name}: ${typeString}${def.isOptional ? "]" : ">"} `;
        }

        return str.trimEnd();
    }
}

export default ArgumentParser;
