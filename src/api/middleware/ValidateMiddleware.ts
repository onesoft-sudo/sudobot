import { NextFunction, Response } from "express";
import { ZodSchema } from "zod";
import { log } from "../../utils/logger";
import Request from "../Request";

export default async function ValidateMiddleware(schema: ZodSchema, request: Request, response: Response, next: NextFunction) {
    try {
        const parsedBody = await schema.parseAsync(request.body);
        request.parsedBody = parsedBody;
        next();
    } catch (e) {
        log(e);
        response.status(400).json(e);
    }
}
