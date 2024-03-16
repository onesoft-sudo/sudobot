import { Message } from "discord.js";
import { ArgumentPayload, Command } from "../commands/Command";
import Context from "../commands/Context";
import LegacyContext from "../commands/LegacyContext";
import { HasClient } from "../types/HasClient";
import Argument from "./Argument";
import { ArgumentTypeOptions } from "./ArgumentTypes";

class ArgumentParser extends HasClient {
    public async parseArguments(
        commandContent: string,
        message: Message<true>,
        commandName: string,
        command: Command,
        args: string[],
        argv: string[]
    ) {
        const context = new LegacyContext(commandName, message, args, argv);
        const isDynamic = Reflect.getMetadata("command:dynamic", command.constructor);
        const argTypes =
            (Reflect.getMetadata("command:types", command.constructor) as ArgumentTypeOptions[]) ||
            [];
        let payload: ArgumentPayload;

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
                    expectedArgInfo.rules
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

            const { error, value } = await argType.performCast(commandContent, argv, arg, i);

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
}

export default ArgumentParser;
