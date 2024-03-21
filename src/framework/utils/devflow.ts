export class NotImplementedError extends Error {}

export const TODO: ((what?: string) => never) & { Method: (what?: string) => MethodDecorator } = (
    what: string = "Not implemented"
) => {
    throw new NotImplementedError(what);
};

TODO.Method = (what: string = "Not implemented") => {
    return (target, methodName, context) => {
        context.value = (() => TODO(what)) as typeof context.value;
    };
};
