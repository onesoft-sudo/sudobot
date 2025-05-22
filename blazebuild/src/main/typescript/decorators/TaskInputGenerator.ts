export const TaskInputGenerator: MethodDecorator = (
    target: object,
    propertyKey: string | symbol
) => {
    Reflect.defineMetadata(
        "task:input:generator",
        propertyKey,
        target.constructor.prototype
    );
};
