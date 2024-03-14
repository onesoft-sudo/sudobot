import { AnyConstructor } from "./Container";

export function Inject<R extends AnyConstructor>(ref?: R) {
    return (target: object, key: string | symbol, _descriptor?: PropertyDescriptor) => {
        const injections = Reflect.getMetadata("di:inject", target) || [];
        injections.push({ key, ref });
        Reflect.defineMetadata("di:inject", injections, target);
    };
}
