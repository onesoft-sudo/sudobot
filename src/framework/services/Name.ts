import Bind from "../container/Bind";
import type { Service } from "./Service";

export function Name(name: string) {
    return (target: new (...args: never[]) => Service) => {
        Reflect.defineMetadata("service:name", name, target.prototype);
        return Bind(name)(target);
    };
}
