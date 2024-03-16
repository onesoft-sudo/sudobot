import { ErrorType } from "../framework/arguments/InvalidArgumentError";

export const ErrorMessages = {
    reason: {
        [ErrorType.InvalidRange]: "The reason must be between 1 and 4096 characters long.",
        [ErrorType.InvalidType]: "The reason must be a valid string."
    }
};
