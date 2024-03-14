export function InjectOnCall(
    target: object,
    _key: string | symbol,
    _descriptor?: PropertyDescriptor
) {
    Reflect.defineMetadata("di:inject_on_call", true, target);
}
