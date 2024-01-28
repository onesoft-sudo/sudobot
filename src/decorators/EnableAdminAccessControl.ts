/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021-2023 OSN Developers.
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

import { NextFunction, Request, Response } from "express";
import AdminAccessControl from "../api/middleware/AdminAccessControl";
import type Client from "../core/Client";

export function EnableAdminAccessControl() {
    return (
        originalMethodOrTarget: any,
        contextOrMethodName: string | ClassMethodDecoratorContext,
        descriptor?: PropertyDescriptor
    ) => {
        if (typeof contextOrMethodName === "string") {
            const metadata = Reflect.getMetadata("aac_middleware", originalMethodOrTarget) ?? {};
            const middleware = (client: Client, req: Request, res: Response, next: NextFunction) =>
                AdminAccessControl(req, res, next);

            metadata[contextOrMethodName] ??= middleware;
            Reflect.defineMetadata("aac_middleware", metadata, originalMethodOrTarget);
        } else {
            const metadata = (contextOrMethodName.metadata?.adminAccessControlMiddleware ?? {}) as Record<string, Function>;
            const middleware = (client: Client, req: Request, res: Response, next: NextFunction) =>
                AdminAccessControl(req, res, next);

            metadata[contextOrMethodName.name as keyof typeof metadata] ??= middleware;
            (contextOrMethodName.metadata as unknown) ??= {};
            contextOrMethodName.metadata.adminAccessControlMiddleware = metadata;
            return originalMethodOrTarget;
        }
    };
}
