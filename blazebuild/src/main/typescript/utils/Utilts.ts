import { NullOrUndefinedError } from "./NullOrUndefinedError";

export class Utils {
    public static requireNonNull<T>(value: T | null | undefined, message: string): T {
        if (value === null || value === undefined) {
            throw new NullOrUndefinedError(message);
        }

        return value;
    }
}