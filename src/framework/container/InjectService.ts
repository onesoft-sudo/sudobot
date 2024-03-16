import { AnyConstructor } from "./Container";

export function InjectService<R extends AnyConstructor>(ref?: R) {
    return (target: object, key: string | symbol, _descriptor?: PropertyDescriptor) => {
        const injections = Reflect.getMetadata("di:inject:services", target) || [];
        injections.push({ key, ref });
        Reflect.defineMetadata("di:inject:services", injections, target);
    };
}
