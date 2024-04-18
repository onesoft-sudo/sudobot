export interface JSONSerializable<T = unknown> {
    toJSON(): T;
}