import { NextFunction, Request, Response } from "express";
import type Controller from "../api/Controller";
import AdminAccessControl from "../api/middleware/AdminAccessControl";
import type Client from "../core/Client";

export function EnableAdminAccessControl() {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata = Reflect.getMetadata("aac_middleware", target) ?? {};
        const middleware = (client: Client, req: Request, res: Response, next: NextFunction) =>
            AdminAccessControl(req, res, next);

        metadata[propertyKey] ??= middleware;
        Reflect.defineMetadata("aac_middleware", metadata, target);
    };
}
