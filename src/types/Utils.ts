export type DefaultExport<T> = {
    default: T;
};

export type Class<I, A extends Array<any>> = new (...a: A) => I;
export type RecordValue<T> = T[keyof T];
