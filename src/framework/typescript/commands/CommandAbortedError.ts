import type Command from "./Command";

class CommandAbortedError extends Error {
    public constructor(
        public readonly command: Command,
        message: string
    ) {
        super(message);
    }
}

export default CommandAbortedError;
