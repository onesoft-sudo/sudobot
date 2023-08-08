import { log } from "console";
import type Controller from "../api/Controller";

export function Action(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", uri: string, middleware: Function[] = []) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata: Record<string, { handler?: Function; method?: string; middleware?: Function[] } | undefined> =
            Reflect.getMetadata("action_methods", target) ?? {};

        metadata[uri] ??= {};
        metadata[uri]!.handler ??= descriptor.value;
        metadata[uri]!.method ??= "GET";
        metadata[uri]!.middleware ??= middleware;

        Reflect.defineMetadata("action_methods", metadata, target);
        log("Found controller function: ", propertyKey);
    };
}
