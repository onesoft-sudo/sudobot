export const TaskAction: MethodDecorator = (
    target: object,
    propertyKey: string | symbol
) => {
    Reflect.defineMetadata(
        "task:action",
        propertyKey,
        target.constructor.prototype
    );
};
