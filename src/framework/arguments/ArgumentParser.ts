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

import { Awaitable, ChatInputCommandInteraction } from "discord.js";
import { ArgumentPayload, Command } from "../commands/Command";
import Context from "../commands/Context";
import InteractionContext from "../commands/InteractionContext";
import LegacyContext from "../commands/LegacyContext";
import { HasClient } from "../types/HasClient";
import Argument from "./Argument";
import { ArgumentTypeOptions } from "./ArgumentTypes";

type ParseResult =
    | {
          error: null | undefined;
          payload: ArgumentPayload;
          abort: undefined;
      }
    | {
          error: string;
          payload: undefined;
          abort: undefined;
      }
    | {
          error: undefined;
          payload: undefined;
          abort: boolean;
      };

class ArgumentParser extends HasClient {
    public async parseArguments(context: LegacyContext, commandContent: string, command: Command, subcommand = false) {
        const isDynamic = Reflect.getMetadata("command:dynamic", command.constructor);
        const argTypes =
            (Reflect.getMetadata("command:types", command.constructor) as ArgumentTypeOptions[]) ||
            [];
        let payload: ArgumentPayload;
        const { args, argv } = context;

        if (isDynamic) {
            const paramTypes = Reflect.getMetadata(
                "design:paramtypes",
                command.constructor,
                "execute"
            ) as unknown[] | undefined;

            if (paramTypes === undefined) {
                throw new Error("Dynamic command is missing parameter types metadata");
            }

            if (!([Context, Object, LegacyContext] as unknown[]).includes(paramTypes[0])) {
                throw new Error(
                    "First parameter of the execute method in a dynamic command must be a valid context"
                );
            }

            const { error, value } = await this.parseArgumentsUsingParamTypes(
                commandContent,
                args,
                argv,
                paramTypes,
                subcommand,
            );

            if (error) {
                return {
                    error,
                    context
                };
            }

            payload = value!;
        } else {
            const { error, value, abort } = await this.parseArgumentsUsingCustomTypes(
                commandContent,
                args,
                argv,
                argTypes,
                subcommand,
                command.onSubcommandNotFound?.bind(command)
                    ?? Reflect.getMetadata("command:subcommand_not_found_error", command.constructor),
                context
            );

            if (abort) {
                return {
                    abort: true
                };
            }

            if (error) {
                return {
                    error,
                    context
                };
            }

            payload = [value!];
        }

        return {
            context,
            payload
        };
    }

    private async parseArgumentsUsingCustomTypes(
        commandContent: string,
        args: string[],
        argv: string[],
        types: ArgumentTypeOptions[],
        subcommand = false,
        onSubcommandNotFound?: string | ((context: Context, subcommand: string) => Awaitable<void>),
        context?: Context
    ) {
        const parsedArguments: Record<string, unknown> = {};
        let lastError;

        if (subcommand && args[0] === undefined) {
            if (typeof onSubcommandNotFound === "function" && context) {
                await onSubcommandNotFound(context, args[0]);

                return {
                    abort: true
                };
            }

            return {
                error: "A subcommand is required!"
            };
        }

        for (let i = subcommand && types.length ? 1 : 0; i < types.length; i++) {
            const arg = args[i];
            const expectedArgInfo = types[i];

            if (!arg) {
                if (expectedArgInfo.default !== undefined || expectedArgInfo.optional) {
                    parsedArguments[expectedArgInfo.name] = expectedArgInfo.default ?? null;
                    continue;
                }

                return {
                    error:
                        expectedArgInfo.errorMessages?.Required ??
                        `${expectedArgInfo.name} is required!`
                };
            }

            const argTypes = Array.isArray(expectedArgInfo.types)
                ? expectedArgInfo.types
                : [expectedArgInfo.types];

            for (const argType of argTypes) {
                const { error, value } = await argType.performCast(
                    commandContent,
                    argv,
                    arg,
                    i,
                    expectedArgInfo.name,
                    expectedArgInfo.rules,
                    !expectedArgInfo.optional
                );

                if (value) {
                    parsedArguments[expectedArgInfo.name] = value.getValue();
                    lastError = undefined;
                    break;
                }

                lastError = error;
            }

            if (lastError) {
                return {
                    error: expectedArgInfo.errorMessages?.[lastError.meta.type] ?? lastError.message
                };
            }
        }

        return {
            error: null,
            value: parsedArguments
        };
    }

    private async parseArgumentsUsingParamTypes(
        commandContent: string,
        args: string[],
        argv: string[],
        types: unknown[],
        subcommand = false,
    ) {
        const parsedArguments = [];

        if (subcommand && args[0] === undefined) {
            return {
                error: "A subcommand is required!"
            };
        }

        for (let i = subcommand && types.length ? 1 : 0; i < types.length; i++) {
            const arg = args[i];
            const argType = types[i] as typeof Argument;

            if (arg === undefined) {
                return {
                    error: `${argType.name} is required!`
                };
            }

            const { error, value } = await argType.performCast(
                commandContent,
                argv,
                arg,
                i,
                undefined,
                undefined,
                true
            );

            if (error) {
                return {
                    error: error.message
                };
            }

            parsedArguments.push(value!);
        }

        return {
            error: null,
            value: parsedArguments
        };
    }

    public async parse(
        context: LegacyContext | InteractionContext,
        command: Command,
        commandContent?: string,
        subcommand = false
    ): Promise<ParseResult> {
        if (context instanceof LegacyContext) {
            return await this.parseArguments(context, commandContent!, command, subcommand);
        } else if (context.isChatInput) {
            return await this.parseFromInteraction(
                context as InteractionContext<ChatInputCommandInteraction>,
                command,
            );
        }

        return { error: null, payload: [], abort: undefined };
    }

    public async parseFromInteraction(
        context: InteractionContext<ChatInputCommandInteraction>,
        command: Command,
    ): Promise<ParseResult> {
        const interaction = context.commandMessage as ChatInputCommandInteraction;
        const expectedArgs =
            (Reflect.getMetadata("command:types", command.constructor) as ArgumentTypeOptions[]) ||
            [];
        const isDynamic = Reflect.getMetadata("command:dynamic", command.constructor);

        if (isDynamic) {
            throw new Error("Dynamic commands are not supported with interactions");
        }

        const args: Record<string, unknown> = {};

        for (const expectedArgInfo of expectedArgs) {
            const type =
                expectedArgInfo.interactionType ??
                (Array.isArray(expectedArgInfo.types)
                    ? expectedArgInfo.types[0]
                    : expectedArgInfo.types);

            if (
                !expectedArgInfo.rules?.["interaction:no_required_check"] &&
                !interaction.options.get(expectedArgInfo.name)
            ) {
                if (expectedArgInfo.optional || expectedArgInfo.default !== undefined) {
                    args[expectedArgInfo.name] = expectedArgInfo.default ?? null;
                    continue;
                }

                return {
                    error:
                        expectedArgInfo.errorMessages?.Required ??
                        `${expectedArgInfo.name} is required!`,
                    payload: undefined,
                    abort: undefined
                };
            }

            const { error, value } = await type.performCastFromInteraction(
                interaction,
                expectedArgInfo.name,
                expectedArgInfo.rules,
                !expectedArgInfo.optional
            );

            if (error) {
                return {
                    error: error.message,
                    payload: undefined,
                    abort: undefined
                };
            }

            args[expectedArgInfo.name] = value?.getValue();
        }

        return {
            error: null,
            payload: [args],
            abort: undefined
        };
    }
}

export default ArgumentParser;
