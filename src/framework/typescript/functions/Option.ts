import EmptyOptionError from "./EmptyOptionError";

class Option<in out T> {
    private readonly value?: T;
    private readonly hasValue: boolean;

    private constructor(value: T | undefined, hasValue: boolean) {
        this.value = value;
        this.hasValue = hasValue;
    }

    public static empty<T>() {
        return new Option<T>(undefined, false);
    }

    public static withValue<T>(value: T) {
        return new Option<T>(value, true);
    }

    /**
     * Get the value.
     *
     * @returns The value if available.
     * @throws {TypeError} If the option instance is empty.
     */
    public get() {
        if (!this.hasValue) {
            throw new EmptyOptionError("Attempted to get value on an empty Option<T> instance");
        }

        return this.value as T;
    }

    public getOrDefault(fallback: T) {
        if (!this.hasValue) {
            return fallback;
        }

        return this.value as T;
    }
}

export default Option;
