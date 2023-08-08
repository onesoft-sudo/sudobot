import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import type Controller from "../api/Controller";
import ValidateMiddleware from "../api/middleware/ValidateMiddleware";

export function Validate(schema: ZodSchema) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata: Record<
            string,
            { handler?: Function; method?: string; middleware?: Function[]; path?: string } | undefined
        > = Reflect.getMetadata("action_methods", target) ?? {};

        metadata[propertyKey] ??= {};
        metadata[propertyKey]!.middleware ??= [];
        metadata[propertyKey]!.middleware!.push((req: Request, res: Response, next: NextFunction) =>
            ValidateMiddleware(schema, req, res, next)
        );

        Reflect.defineMetadata("action_methods", metadata, target);
    };
}
