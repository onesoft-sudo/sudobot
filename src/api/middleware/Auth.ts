
/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
*
* SudoBot is free software; you can redistribute it and/or modify it
* under the terms of the GNU Affero General Public License as published by 
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* SudoBot is distributed in the hope that it will be useful, but
* WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the 
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License 
* along with SudoBot. If not, see <https://www.gnu.org/licenses/>.
*/

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