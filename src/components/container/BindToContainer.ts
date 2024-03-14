import Container, { BindOptions as DIBindOptions } from "./Container";

type BindOptions<T> = Omit<DIBindOptions<T>, "value" | "factory"> & {
    container?: (() => Container) | Container;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function BindToContainer<T extends new (...args: any[]) => any>(
    options?: BindOptions<T>
) {
    return (constructor: T, context?: ClassDecoratorContext<T>) => {
        console.log(`Binding class ${constructor.name} to container with key ${options?.key}`);

        if (context) {
            (context.metadata as Record<string, string>) ??= {};
            context.metadata.bindToContainer = options?.key ?? null;
        } else {
            Reflect.defineMetadata("di:bind", options?.key ?? null, constructor);
        }

        const container =
            typeof options?.container === "function" ? options.container() : options?.container;

        if (container) {
            container.bind(constructor, {
                key: options?.key,
                singleton: options?.singleton,
                callImmediately: options?.callImmediately
            });
        }

        return constructor;
    };
}
