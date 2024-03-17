import CanBind from "./CanBind";
import { ContainerBindOptions as DIBindOptions } from "./Container";

type BindOptions<T> = Omit<DIBindOptions, "value" | "factory">;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function BindToContainer<T extends new (...args: any[]) => any>(
    options?: BindOptions<T>
) {
    return (constructor: T, context?: ClassDecoratorContext<T>) => {
        CanBind(constructor, context);

        if (context) {
            (context.metadata as Record<string, string>) ??= {};
            context.metadata.bindToContainer = options?.key ?? null;
        } else {
            Reflect.defineMetadata("di:bind", { ...options, ref: constructor }, constructor);
        }

        return constructor;
    };
}
