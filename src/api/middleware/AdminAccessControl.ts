import { NextFunction, Response } from "express";
import Request from "../Request";

const ROOT_USER_ID = 1;

export default async function AdminAccessControl(request: Request, response: Response, next: NextFunction) {
    if (!request.user) {
        response.status(401).send({
            error: "Cannot authorize this request."
        });

        return;
    }

    if (request.userId !== ROOT_USER_ID) {
        response.status(403).send({
            error: "Access denied."
        });

        return;
    }

    next();
}
