import { NextFunction, Request, Response } from "express";
import type Controller from "../api/Controller";
import RequireAuthMiddleware from "../api/middleware/RequireAuthMiddleware";
import type Client from "../core/Client";

export function RequireAuth(fetchUser = true) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata: Record<
            string,
            { handler?: Function; method?: string; middleware?: Function[]; path?: string } | undefined
        > = Reflect.getMetadata("action_methods", target) ?? {};

        metadata[propertyKey] ??= {};
        metadata[propertyKey]!.middleware ??= [];
        metadata[propertyKey]!.middleware!.push((client: Client, req: Request, res: Response, next: NextFunction) =>
            RequireAuthMiddleware(client, fetchUser, req, res, next)
        );

        Reflect.defineMetadata("action_methods", metadata, target);
    };
}
