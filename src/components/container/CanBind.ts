export default function CanBind<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends (new (...args: any[]) => any) | (abstract new (...args: any[]) => any)
>(constructor: T, _context?: ClassDecoratorContext<T>) {
    Reflect.defineMetadata("di:can-bind", true, constructor);
    return constructor;
}
