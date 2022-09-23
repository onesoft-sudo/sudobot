import { NextFunction, Response } from "express";
import Request from "../Request";
import Auth from "./Auth";

export default async function RequireAuth(request: Request, response: Response, next: NextFunction) {
    if (!request.user) {
        const { authorization } = request.headers;

        if (!authorization) {
            return response.status(401).send({ error: "No authorization header in the request" });
        }

        return Auth(request, response, next);
    }

    next();
}