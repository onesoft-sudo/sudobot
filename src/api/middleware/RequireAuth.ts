
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