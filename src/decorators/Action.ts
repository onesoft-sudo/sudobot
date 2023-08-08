import { log } from "console";
import type Controller from "../api/Controller";

export function Action(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", uri: string, middleware: Function[] = []) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata: Record<
            string,
            { handler?: Function; method?: string; middleware?: Function[]; path?: string } | undefined
        > = Reflect.getMetadata("action_methods", target) ?? {};

        metadata[propertyKey] ??= {};
        metadata[propertyKey]!.handler ??= descriptor.value;
        metadata[propertyKey]!.method ??= "GET";
        metadata[propertyKey]!.path ??= uri;
        metadata[propertyKey]!.middleware ??= middleware;

        Reflect.defineMetadata("action_methods", metadata, target);
        log("Found controller function: ", propertyKey);
    };
}
