export enum ErrorType {
    Required = "Required",
    InvalidType = "InvalidType",
    InvalidRange = "InvalidRange",
    EntityNotFound = "EntityNotFound"
}

export type Meta = {
    position: number;
    type: ErrorType;
    cause?: unknown;
};

export class InvalidArgumentError extends Error {
    public override readonly name = "InvalidArgumentError";

    public constructor(message: string, public readonly meta: Meta) {
        super(message, {
            cause: meta.cause
        });
    }
}
