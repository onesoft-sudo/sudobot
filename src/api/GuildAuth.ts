import { NextFunction, Request, Response } from "express";
import DiscordClient from "../client/Client";

export default function guildAuth(req: Request, res: Response, next: NextFunction) {
    let token = req.body.token;

    if (!token)
        token = req.query.token;

    if (!req.params.guild || !token || !DiscordClient.client.server.verifyToken(req.params.guild, token)) {
        res.status(403).json({
            status: 403,
            message: "Forbidden",
            detail: "You don't have permission to access this resource"
        });

        return;
    }

    next();
};