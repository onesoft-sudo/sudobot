// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function CanBind<T extends new (...args: any[]) => any>(
    constructor: T,
    _context?: ClassDecoratorContext<T>
) {
    Reflect.defineMetadata("di:can-bind", true, constructor);
    return constructor;
}
