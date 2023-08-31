import { NextFunction, Request, Response } from "express";
import type Controller from "../api/Controller";
import GuildAccessControl from "../api/middleware/GuildAccessControl";
import type Client from "../core/Client";

export function EnableGuildAccessControl() {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata = Reflect.getMetadata("gac_middleware", target) ?? {};
        const middleware = (client: Client, req: Request, res: Response, next: NextFunction) =>
            GuildAccessControl(req, res, next);

        metadata[propertyKey] ??= middleware;
        Reflect.defineMetadata("gac_middleware", metadata, target);
    };
}
