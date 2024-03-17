import { AnyConstructor } from "./Container";

export function InjectService<R extends AnyConstructor>(ref?: R | string) {
    return (target: object, key: string | symbol, _descriptor?: PropertyDescriptor) => {
        const injections = Reflect.getMetadata("di:inject", target) || [];

        injections.push({
            key,
            ref: typeof ref === "string" ? null : ref,
            name: typeof ref === "string" ? ref : null
        });

        Reflect.defineMetadata("di:inject", injections, target);
    };
}
