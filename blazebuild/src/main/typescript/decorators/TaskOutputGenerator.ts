export const TaskOutputGenerator: MethodDecorator = (
    target: object,
    propertyKey: string | symbol
) => {
    Reflect.defineMetadata(
        "task:output:generator",
        propertyKey,
        target.constructor.prototype
    );
};
