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
import Application from "../app/Application";
import { ArgumentPayload, Command } from "../commands/Command";
import Context from "../commands/Context";
import InteractionContext from "../commands/InteractionContext";
import LegacyContext from "../commands/LegacyContext";
import { HasClient } from "../types/HasClient";
import { notIn } from "../utils/utils";
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
    public async parseArguments(
        context: LegacyContext,
        commandContent: string,
        command: Command,
        subcommand = false
    ) {
        const isDynamic = Reflect.getMetadata("command:dynamic", command.constructor);
        const argTypes =
            (Reflect.getMetadata("command:types", command.constructor) as ArgumentTypeOptions[]) ||
            [];
        let payload: ArgumentPayload;
        const { args, argv } = context;
        const commandManager = Application.current().getServiceByName("commandManager");

        if (isDynamic && !subcommand) {
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
                context
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
                commandManager.commands.get(argv[0])?.subcommands ?? [],
                command.onSubcommandNotFound?.bind(command) ??
                    Reflect.getMetadata("command:subcommand_not_found_error", command.constructor),
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
        allowedSubcommands: string[] | undefined,
        onSubcommandNotFound:
            | string
            | ((
                  context: Context,
                  subcommand: string,
                  errorType: "not_found" | "not_specified"
              ) => Awaitable<void>)
            | undefined,
        context: Context
    ) {
        const parsedArguments: Record<string, unknown> = {};
        let lastError;

        if (subcommand && args[0] === undefined) {
            if (typeof onSubcommandNotFound === "function" && context) {
                await onSubcommandNotFound(context, args[0], "not_specified");

                return {
                    abort: true
                };
            }

            return {
                error: (onSubcommandNotFound as string | undefined) ?? "A subcommand is required!"
            };
        }

        if (subcommand && allowedSubcommands && !allowedSubcommands.includes(args[0])) {
            if (typeof onSubcommandNotFound === "function" && context) {
                await onSubcommandNotFound(context, args[0], "not_found");

                return {
                    abort: true
                };
            }

            return {
                error:
                    (onSubcommandNotFound as string | undefined) ?? "Invalid subcommand provided."
            };
        }

        if (subcommand) {
            const commandManager = Application.current().getServiceByName("commandManager");
            const command = commandManager.commands.get(`${argv[0]}::${args[0]}`);

            if (!command) {
                if (typeof onSubcommandNotFound === "function" && context) {
                    await onSubcommandNotFound(context, args[0], "not_found");

                    return {
                        abort: true
                    };
                }

                return {
                    error:
                        (onSubcommandNotFound as string | undefined) ??
                        "Invalid subcommand provided."
                };
            }

            types =
                (Reflect.getMetadata(
                    "command:types",
                    command.constructor
                ) as ArgumentTypeOptions[]) ?? [];
        }

        for (let i = 0; i < types.length; i++) {
            const argIndex = subcommand && types.length ? i + 1 : i;
            const arg = args[argIndex];
            const expectedArgInfo = types[i];
            const names = Array.isArray(expectedArgInfo.names)
                ? expectedArgInfo.names
                : [expectedArgInfo.names];

            if (names.length === 0) {
                throw new Error("Argument names must be provided");
            }

            if (!arg) {
                if (expectedArgInfo.default !== undefined || expectedArgInfo.optional) {
                    for (const name of names) {
                        if (notIn(parsedArguments, name)) {
                            parsedArguments[name] = expectedArgInfo.default ?? null;
                        }
                    }

                    continue;
                }

                return {
                    error:
                        expectedArgInfo.errorMessages?.[0]?.Required ??
                        `${expectedArgInfo.names.join(", or ")} is required!`
                };
            }

            const argTypes = Array.isArray(expectedArgInfo.types)
                ? expectedArgInfo.types
                : [expectedArgInfo.types];

            let argTypeIndex = 0;

            for (const argType of argTypes) {
                const name = names[argTypeIndex] ?? names.at(-1);

                if (name in parsedArguments) {
                    break;
                }

                const { error, value } = await argType.performCast(
                    context,
                    commandContent,
                    argv,
                    arg,
                    argIndex,
                    name,
                    expectedArgInfo.rules,
                    !expectedArgInfo.optional
                );

                if (value && !error) {
                    parsedArguments[name] = value.getValue();
                    lastError = undefined;
                    break;
                }

                lastError = error;

                if (error && error.meta.noSkip) {
                    break;
                }

                argTypeIndex++;
            }

            if (lastError) {
                return {
                    error:
                        (expectedArgInfo.errorMessages?.[argTypeIndex] ??
                            expectedArgInfo.errorMessages?.at(-1))?.[lastError.meta.type] ??
                        lastError.message
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
        context: Context
    ) {
        const parsedArguments = [];

        for (let i = 0; i < types.length; i++) {
            const arg = args[i];
            const argType = types[i] as typeof Argument;

            if (arg === undefined) {
                return {
                    error: `${argType.name} is required!`
                };
            }

            const { error, value } = await argType.performCast(
                context,
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
        } else if (context.isChatInput()) {
            return await this.parseFromInteraction(
                context as InteractionContext<ChatInputCommandInteraction>,
                command
            );
        }

        return { error: null, payload: [], abort: undefined };
    }

    public async parseFromInteraction(
        context: InteractionContext<ChatInputCommandInteraction>,
        command: Command
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

            if (expectedArgInfo.names.length === 0) {
                throw new Error("Argument names must be provided");
            } else if (expectedArgInfo.names.length > 1) {
                throw new Error("Only 1 argument name is allowed for auto-parsing!");
            }

            const name = expectedArgInfo.interactionName ?? expectedArgInfo.names[0];

            if (
                !expectedArgInfo.rules?.["interaction:no_required_check"] &&
                !interaction.options.get(name)
            ) {
                if (expectedArgInfo.optional || expectedArgInfo.default !== undefined) {
                    args[name] = expectedArgInfo.default ?? null;
                    continue;
                }

                return {
                    error: expectedArgInfo.errorMessages?.[0]?.Required ?? `${name} is required!`,
                    payload: undefined,
                    abort: undefined
                };
            }

            const { error, value } = await type.performCastFromInteraction(
                context,
                interaction,
                name,
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

            args[name] = value?.getValue();
        }

        return {
            error: null,
            payload: [args],
            abort: undefined
        };
    }
}

export default ArgumentParser;
