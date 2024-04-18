export interface BehavesLikePrimitive {
    [Symbol.toPrimitive]: (hint: "string" | "number" | "default") => string | number;
}