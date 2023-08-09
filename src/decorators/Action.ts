import { log } from "console";
import type Controller from "../api/Controller";
import { RouteMetadata } from "../types/RouteMetadata";

export function Action(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", uri: string, middleware: Function[] = []) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata: Record<string, RouteMetadata> = Reflect.getMetadata("action_methods", target) ?? {
            [propertyKey]: {
                GET: null,
                DELETE: null,
                PATCH: null,
                POST: null,
                PUT: null
            } as RouteMetadata
        };

        metadata[propertyKey] ??= {
            GET: null,
            DELETE: null,
            PATCH: null,
            POST: null,
            PUT: null
        } as RouteMetadata;

        const data = { handler: descriptor.value, method, path: uri, middleware };

        metadata[propertyKey]![method] ??= data;
        metadata[propertyKey]![method]!.handler ??= data.handler;
        metadata[propertyKey]![method]!.method ??= data.method;

        if (metadata[propertyKey]![method]!.middleware?.length) {
            metadata[propertyKey]![method]!.middleware.push(...data.middleware);
        } else {
            metadata[propertyKey]![method]!.middleware = data.middleware;
        }

        Reflect.defineMetadata("action_methods", metadata, target);
        log("Found controller function: ", propertyKey);
    };
}
