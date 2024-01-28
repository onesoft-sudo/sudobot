export type DefaultExport<T> = {
    default: T;
};

export type Class<I, A extends Array<any>> = new (...a: A) => I;
