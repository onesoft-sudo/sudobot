import type { Service } from "./Service";

export function Name(name: string) {
    return (target: new (...args: never[]) => Service) =>
        void Reflect.defineMetadata("service:name", name, target.prototype);
}
