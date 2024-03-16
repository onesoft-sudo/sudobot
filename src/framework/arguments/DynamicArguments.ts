export function DynamicArguments(target: object, _propertyKey?: unknown, _descriptor?: unknown) {
    Reflect.defineMetadata("command:dynamic", true, target);
}
