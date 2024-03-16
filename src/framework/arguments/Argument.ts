import { Awaitable } from "discord.js";
import { ArgumentInterface } from "./ArgumentInterface";
import { ArgumentTypeOptions } from "./ArgumentTypes";
import { ErrorType, InvalidArgumentError } from "./InvalidArgumentError";

export type Casted<T> = {
    value?: Argument<T>;
    error?: InvalidArgumentError;
};

export type ArgumentConstructor = (new (
    ...args: ConstructorParameters<typeof Argument>
) => Argument) &
    Pick<typeof Argument, "performCast">;

export default abstract class Argument<T = unknown> implements ArgumentInterface<T> {
    protected readonly stringValue: string;
    protected transformedValue!: T;
    public readonly position: number;
    public readonly name?: string;
    protected readonly rules?: NonNullable<ArgumentTypeOptions["rules"]>;

    public constructor(
        value: string,
        position: number,
        name?: string,
        rules?: NonNullable<ArgumentTypeOptions["rules"]>
    ) {
        this.stringValue = value;
        this.position = position;
        this.rules = rules;
        this.name = name;
    }

    /**
     * This method is used to validate the argument string, before transformation.
     *
     * @returns {Awaitable<boolean>} Whether the argument is valid.
     * @throws {InvalidArgumentError} If the argument is invalid.
     */
    public abstract validate(): Awaitable<boolean>;
    public abstract toString(): string;
    protected abstract transform(): Awaitable<T>;

    public async toTransformed() {
        this.transformedValue = await this.transform();

        if (!(await this.postTransformValidation())) {
            this.error("Invalid argument received", ErrorType.InvalidType);
        }

        return this;
    }

    /**
     * This method is used to validate the argument after transformation.
     *
     * @returns {Awaitable<boolean>} Whether the argument is valid.
     * @throws {InvalidArgumentError} If the argument is invalid.
     */
    public postTransformValidation(): Awaitable<boolean> {
        return true;
    }

    public getRawValue() {
        return this.stringValue;
    }

    public getValue() {
        return this.transformedValue!;
    }

    protected error(
        message: string,
        type: ErrorType,
        ruleLike?: string | { message?: string } | undefined
    ): never {
        throw new InvalidArgumentError(
            (typeof ruleLike === "string" ? ruleLike : ruleLike?.message) ?? message,
            {
                position: this.position,
                type
            }
        );
    }

    protected attemptValidation() {
        if (this.rules?.choices?.length && !this.rules?.choices.includes(this.stringValue)) {
            return this.error(
                `Invalid choice received at position #${this.position}`,
                ErrorType.InvalidType
            );
        }

        return this.validate();
    }

    public static async performCast(
        value: string,
        position: number,
        name?: string,
        rules?: NonNullable<ArgumentTypeOptions["rules"]>
    ): Promise<Casted<unknown>> {
        try {
            const casted = await this.castFrom(value, position, name, rules);

            if (!casted.attemptValidation()) {
                throw new InvalidArgumentError(
                    `Invalid argument received at position #${position}`,
                    {
                        position,
                        type: ErrorType.InvalidType
                    }
                );
            }

            return {
                value: await casted.toTransformed()
            };
        } catch (error) {
            if (error instanceof InvalidArgumentError) {
                return {
                    error
                };
            }

            throw error;
        }
    }

    public static castFrom(
        value: string,
        position: number,
        name?: string,
        rules?: NonNullable<ArgumentTypeOptions["rules"]>
    ) {
        return new (this as unknown as new (
            ...args: ConstructorParameters<typeof Argument<unknown>>
        ) => Argument<unknown>)(value, position, name, rules);
    }
}
