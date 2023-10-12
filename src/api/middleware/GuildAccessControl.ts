import { NextFunction, Response } from "express";
import Request from "../Request";

export default async function GuildAccessControl(request: Request, response: Response, next: NextFunction) {
    if (!request.params.guild) {
        response.status(401).send({
            error: "Cannot authorize access without a Guild ID."
        });

        return;
    }

    if (!request.user?.guilds.includes(request.params.guild)) {
        response.status(403).send({
            error: "Access denied."
        });

        return;
    }

    next();
}
