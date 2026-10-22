export const MessageControllerHandlersSymbol = Symbol("MessageControllerHandlers");

export function MessageController(target: object) {
    const handlers = Reflect.getMetadata(MessageControllerHandlersSymbol, target) ?? [];
    Reflect.defineMetadata(MessageControllerHandlersSymbol, handlers, target);
}

export function WithResourceId(id: string) {
    return ((target: object, key: PropertyKey, _: PropertyDescriptor) => {
        const handlers = Reflect.getMetadata(MessageControllerHandlersSymbol, target.constructor) ?? [];

        handlers.push({
            key,
            resourceId: id
        });

        Reflect.defineMetadata(MessageControllerHandlersSymbol, handlers, target.constructor);
    }) satisfies MethodDecorator;
}

export function getMessageControllerHandlerList(target: object): Array<MessageControllerHandlerMetadata> | undefined {
    return Reflect.getMetadata(MessageControllerHandlersSymbol, target);
}

export type MessageControllerHandlerMetadata = { key: PropertyKey; resourceId: string };
