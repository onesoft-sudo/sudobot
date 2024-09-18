/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import { users } from "@main/models/User";
import { APIErrorCode } from "@main/types/APIErrorCode";
import { and, eq } from "drizzle-orm";
import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type Application from "../../app/Application";
import type Request from "../http/Request";

export default async function RequireAuthMiddleware(
    application: Application,
    fetchUser: boolean = true,
    request: Request,
    response: Response,
    next: NextFunction
) {
    if (!request.headers.authorization) {
        response.status(401).json({
            error: "No authorization header found in the request",
            code: APIErrorCode.Unauthorized
        });

        return;
    }

    const [type, token] = request.headers.authorization.split(/\s+/);

    if (type.toLowerCase() !== "bearer") {
        response.status(401).json({
            error: "Only bearer tokens are supported",
            code: APIErrorCode.Unauthorized
        });

        return;
    }

    try {
        const info = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: process.env.JWT_ISSUER ?? "SudoBot",
            complete: true
        });

        const payload = info.payload as {
            id: number;
        };

        application.logger.debug(info, payload);

        if (typeof payload?.id !== "number") {
            throw new Error("ID not found");
        }

        if (!fetchUser) {
            request.userId = payload.id;
            next();
            return;
        }

        const user = await application.database.query.users.findFirst({
            where: and(eq(users.id, payload.id), eq(users.token, token))
        });

        if (!user || Date.now() > (user?.tokenExpiresAt?.getTime() ?? 0)) {
            throw new Error();
        }

        request.userId = user.id;
        request.user = user;
        next();
    } catch (e) {
        application.logger.debug(e);

        response.status(401).json({
            error: "Invalid API token",
            code: APIErrorCode.Unauthorized
        });

        return;
    }
}
