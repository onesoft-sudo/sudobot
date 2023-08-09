import { NextFunction, Request, Response } from "express";
import type Controller from "../api/Controller";
import RequireAuthMiddleware from "../api/middleware/RequireAuthMiddleware";
import type Client from "../core/Client";

export function RequireAuth(fetchUser = true) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata = Reflect.getMetadata("auth_middleware", target) ?? {};
        const middleware = (client: Client, req: Request, res: Response, next: NextFunction) =>
            RequireAuthMiddleware(client, fetchUser, req, res, next);

        metadata[propertyKey] ??= middleware;

        Reflect.defineMetadata("auth_middleware", metadata, target);
    };
}
