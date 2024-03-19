import CanBind from "./CanBind";
import { AnyConstructor, ContainerBindOptions as DIBindOptions } from "./Container";

type BindOptions<T extends AnyConstructor> = Omit<DIBindOptions<T>, "value" | "factory">;

export default function BindToContainer<T extends AnyConstructor>(options?: BindOptions<T>) {
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
