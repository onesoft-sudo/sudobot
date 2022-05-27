import { NextFunction, Request, Response } from "express";
import DiscordClient from "../client/Client";

export default function auth(req: Request, res: Response, next: NextFunction) {
    let token = req.body.token;

    if (!token)
        token = req.query.token;

    if (!token || !DiscordClient.client.server.validToken(token)) {
        res.status(401).json({
            status: 401,
            message: "Unauthorized",
            detail: "Invalid authentication credentials provided"
        });

        return;
    }

    next();
};