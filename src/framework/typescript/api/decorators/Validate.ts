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

import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import type Application from "../../app/Application";
import ValidateMiddleware from "../middleware/ValidateMiddleware";

export function Validate(schema: ZodSchema) {
    return (
        originalMethodOrTarget: unknown,
        contextOrMethodName: string | ClassMethodDecoratorContext,
        _descriptor?: PropertyDescriptor
    ) => {
        if (typeof contextOrMethodName === "string") {
            const metadata =
                (Reflect.getMetadata("validation_middleware", originalMethodOrTarget as object) as
                    | Record<string, unknown>
                    | undefined) ?? {};
            const middleware = (
                _application: Application,
                req: Request,
                res: Response,
                next: NextFunction
            ) => ValidateMiddleware(schema, req, res, next);

            metadata[contextOrMethodName] ??= middleware;
            Reflect.defineMetadata(
                "validation_middleware",
                metadata,
                originalMethodOrTarget as object
            );
        } else {
            const metadata = (contextOrMethodName.metadata?.validationMiddleware ?? {}) as Record<
                string | symbol,
                (
                    application: Application,
                    req: Request,
                    res: Response,
                    next: NextFunction
                ) => ReturnType<typeof ValidateMiddleware>
            >;

            const middleware = (
                _application: Application,
                req: Request,
                res: Response,
                next: NextFunction
            ) => ValidateMiddleware(schema, req, res, next);

            metadata[contextOrMethodName.name] ??= middleware;
            (contextOrMethodName.metadata as unknown) ??= {};
            contextOrMethodName.metadata.validationMiddleware = metadata;
            return originalMethodOrTarget as void;
        }
    };
}
