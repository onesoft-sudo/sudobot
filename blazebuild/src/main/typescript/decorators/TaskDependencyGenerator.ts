export const TaskDependencyGenerator: MethodDecorator = (
    target: object,
    propertyKey: string | symbol
) => {
    Reflect.defineMetadata(
        "task:dependencies:generator",
        propertyKey,
        target.constructor.prototype
    );
};
