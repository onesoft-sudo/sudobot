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

import type { NextFunction, Response } from "express";
import type { ZodSchema } from "zod";
import Application from "../../app/Application";
import type Request from "../http/Request";

export default async function ValidateMiddleware(
    schema: ZodSchema,
    request: Request,
    response: Response,
    next: NextFunction
) {
    try {
        const parsedBody = await schema.parseAsync(request.body);
        request.parsedBody = parsedBody;
        next();
    } catch (e) {
        Application.current().logger.error(e);
        response.status(400).json(e);
    }
}
