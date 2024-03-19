import { ChatInputCommandInteraction } from "discord.js";
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
      }
    | {
          error: string;
          payload: undefined;
      };

class ArgumentParser extends HasClient {
    public async parseArguments(context: LegacyContext, commandContent: string, command: Command) {
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
                paramTypes
            );

            if (error) {
                return {
                    error,
                    context
                };
            }

            payload = value!;
        } else {
            const { error, value } = await this.parseArgumentsUsingCustomTypes(
                commandContent,
                args,
                argv,
                argTypes
            );

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
        types: ArgumentTypeOptions[]
    ) {
        const parsedArguments: Record<string, unknown> = {};
        let lastError;

        for (let i = 0; i < types.length; i++) {
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
        types: unknown[]
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
        commandContent?: string
    ): Promise<ParseResult> {
        if (context instanceof LegacyContext) {
            return await this.parseArguments(context, commandContent!, command);
        } else if (context.isChatInput) {
            return await this.parseFromInteraction(
                context as InteractionContext<ChatInputCommandInteraction>,
                command
            );
        }

        return { error: null, payload: [] };
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
                    payload: undefined
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
                    payload: undefined
                };
            }

            args[expectedArgInfo.name] = value?.getValue();
        }

        return {
            error: null,
            payload: [args]
        };
    }
}

export default ArgumentParser;
