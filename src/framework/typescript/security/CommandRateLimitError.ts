import type Command from "@framework/commands/Command.js";

class CommandRateLimitError extends RangeError {
    public constructor(command: Command) {
        super(`Rate limit for command ${command.name} has been exceeded`);;
    }
}

export default CommandRateLimitError;
