import type { Command } from "../commands/Command";
import Context from "../commands/Context";

export type ErrorMessages = {
    notSpecified?: string | ((subcommand: string) => string);
    notFound?: string | ((subcommand: string) => string);
}

export function SubcommandErrorMessage(messages: ErrorMessages): ClassDecorator {
    const handler = function (this: Command, context: Context, subcommand: string, errorType: "not_specified" | "not_found") {
        if (errorType === "not_found") {
            const message = typeof messages.notFound === "string" ? messages.notFound : messages.notFound?.(subcommand);
            return context.error(message ?? "Invalid subcommand provided");
        }

        const message = typeof messages.notSpecified === "string" ? messages.notSpecified : messages.notSpecified?.(subcommand);
        return context.error(message ?? "No subcommand provided");
    };

    return (target: object) => {
        Reflect.defineMetadata("command:subcommand_not_found_error", handler, target);
    };
}