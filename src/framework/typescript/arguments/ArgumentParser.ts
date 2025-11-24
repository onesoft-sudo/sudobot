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

import type Application from "@framework/app/Application";
import type { ArgumentDefinition, ArgumentOverload, ArgumentSchema } from "./ArgumentSchema";
import type InteractionContext from "@framework/commands/InteractionContext";
import type LegacyContext from "@framework/commands/LegacyContext";
import ArgumentParseError from "./ArgumentParseError";
import { InvalidArgumentError } from "./InvalidArgumentError";

type ParserContext = {
    args: readonly string[];
    index: number;
    context: LegacyContext | InteractionContext;
    schema: ArgumentSchema;
    isInteractive: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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
        schema: ArgumentSchema
    ): Promise<{
        args?: Record<string, unknown>;
        overloadIndex?: number;
        errors?: string[];
    }> {
        const { overloads } = schema;
        const parserContext: ParserContext = {
            args: [],
            context,
            schema,
            index: 0,
            isInteractive: true
        };
        const errors = [];
        const overload = overloads[schema.defaultIndex ?? 0];

        tryBlock: try {
            const result = await this.parseOverload(parserContext, overload);

            if (result.error) {
                errors.push(result.error);
                break tryBlock;
            }

            return { args: result.args, overloadIndex: schema.defaultIndex ?? 0 };
        }
        catch (error) {
            if (error instanceof ArgumentParseError || error instanceof InvalidArgumentError) {
                errors.push(error.message);
            }
            else {
                throw error;
            }
        }

        return {
            errors
        };
    }

    protected async parseFromLegacy(
        context: LegacyContext,
        schema: ArgumentSchema
    ): Promise<{
        args?: Record<string, unknown>;
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
                isInteractive: false
            };
            const overload = overloads[i];

            try {
                const result = await this.parseOverload(parserContext, overload);

                if (result.error) {
                    errors.push(result.error);
                    continue;
                }

                return { args: result.args, overloadIndex: i };
            }
            catch (error) {
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
        overload: ArgumentOverload
    ): Promise<
        ParseStepResult<{
            args?: Record<string, unknown>;
        }>
    > {
        const args: Record<string, unknown> = {};

        for (const definition of overload.definitions) {
            const result = await this.parseDefinition(parserContext, definition);

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
            args
        };
    }

    protected async parseDefinition(
        parserContext: ParserContext,
        definition: ArgumentDefinition
    ): Promise<ParseStepResult<{ value?: unknown; break?: boolean }>> {
        const rawValue = parserContext.context.isInteractive()
            ? parserContext.context.commandMessage.options.get(definition.interactionName ?? definition.name)
            : parserContext.args[parserContext.index];

        if (!rawValue) {
            if (definition.isOptional) {
                return { value: null };
            }

            return {
                error: `Argument '${definition.name}' is required`
            };
        }

        const types = Array.isArray(definition.type)
            ? parserContext.isInteractive
                ? [definition.type[definition.defaultIndex ?? 0]]
                : definition.type
            : [definition.type];
        let lastError: ArgumentParseError | undefined;

        for (let i = 0; i < types.length; i++) {
            const type = types[i];

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
                return { value, break: argument.abortAfterParsing };
            } catch (error) {
                if (error instanceof ArgumentParseError || error instanceof InvalidArgumentError) {
                    lastError = error;
                    continue;
                }

                throw error;
            }
        }

        return {
            error: lastError?.message ?? "Invalid parser state: No types to parse or no value could be computed"
        };
    }

    public async parse(context: LegacyContext | InteractionContext, schema: ArgumentSchema) {
        const result = context.isInteractive()
            ? await this.parseFromInteraction(context, schema)
            : await this.parseFromLegacy(context, schema);

        return {
            errors: result.errors,
            args: result.args
        };
    }

    public overloadSignatureToString(overload: ArgumentOverload) {
        let str = "";

        for (const def of overload.definitions) {
            let typeString = "";

            if (Array.isArray(def.type)) {
                for (const type of def.type) {
                    typeString += `${typeString === "" ? "" : " | "}${type.name}`;
                }
            }
            else {
                typeString = def.type.name;
            }

            str += `${def.isOptional ? "[" : "<"}${def.name}: ${typeString}${def.isOptional ? "]" : ">"} `;
        }

        return str.trimEnd();
    }
}

export default ArgumentParser;
