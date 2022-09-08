import { NextFunction, Response } from "express";
import Request from "../Request";
import jwt, { JwtPayload } from 'jsonwebtoken';
import User from "../../models/User";

export default async function Auth(request: Request, response: Response, next: NextFunction) {
    if (!request.user) {
        const { authorization } = request.headers;

        if (!authorization) {
            next();
            return;
        }

        const [type, token] = authorization.split(/ +/);

        if (type !== "Bearer") {
            return response.status(401).send({ error: "Only Bearer tokens are supported" });
        }

        if (!token) {
            return response.status(401).send({ error: "No Bearer token provided" });
        }

        try {
            const { _id, discord_id, username } = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
            
            if (!_id || !discord_id || !username) {
                throw new Error();
            }

            const user = await User.findOne({ _id, discord_id, username });

            if (!user) {
                throw new Error();
            }

            request.user = user;
        } 
        catch (e) {
            console.log(e);   
            return response.status(401).send({ error: "Invalid token provided" });
        }
    }

    next();
}