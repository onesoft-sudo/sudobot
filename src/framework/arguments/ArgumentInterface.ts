export interface ArgumentInterface<T = unknown> {
    toString(): string;
    getRawValue(): string;
    getValue(): T;
}
