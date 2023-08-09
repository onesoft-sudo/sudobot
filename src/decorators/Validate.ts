import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import type Controller from "../api/Controller";
import ValidateMiddleware from "../api/middleware/ValidateMiddleware";
import type Client from "../core/Client";

export function Validate(schema: ZodSchema) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata = Reflect.getMetadata("validation_middleware", target) ?? {};

        const middleware = (client: Client, req: Request, res: Response, next: NextFunction) =>
            ValidateMiddleware(schema, req, res, next);

        metadata[propertyKey] ??= middleware;

        Reflect.defineMetadata("validation_middleware", metadata, target);
    };
}
