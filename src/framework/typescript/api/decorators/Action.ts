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
import type Application from "../../app/Application";
import type { AnyFunction } from "../../types/Utils";
import type { RouteMetadata } from "../RouteMetadata";

export type Middleware = (
    application: Application,
    request: Request,
    response: Response,
    next: NextFunction
) => unknown;

export function Action(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    uri: string,
    middleware: Middleware[] = []
) {
    return (
        originalMethodOrTarget: unknown,
        contextOrMethodName: string | ClassMethodDecoratorContext,
        descriptor?: PropertyDescriptor
    ) => {
        if (typeof contextOrMethodName === "string") {
            const metadata: Record<string, RouteMetadata> = (Reflect.getMetadata(
                "action_methods",
                originalMethodOrTarget as object
            ) as Record<string, RouteMetadata> | undefined) ?? {
                [contextOrMethodName]: {
                    GET: null,
                    DELETE: null,
                    PATCH: null,
                    POST: null,
                    PUT: null
                } as RouteMetadata
            };

            metadata[contextOrMethodName] ??= {
                GET: null,
                DELETE: null,
                PATCH: null,
                POST: null,
                PUT: null
            } as RouteMetadata;

            const data = {
                handler: descriptor!.value as AnyFunction,
                method,
                path: uri,
                middleware: middleware as AnyFunction[]
            };

            metadata[contextOrMethodName][method] ??= data;
            metadata[contextOrMethodName][method].handler ??= data.handler;
            metadata[contextOrMethodName][method].method ??= data.method;

            if (metadata[contextOrMethodName][method].middleware?.length) {
                metadata[contextOrMethodName][method].middleware.push(...data.middleware);
            } else {
                metadata[contextOrMethodName][method].middleware = data.middleware;
            }

            Reflect.defineMetadata("action_methods", metadata, originalMethodOrTarget as object);
        } else {
            const metadata = (contextOrMethodName.metadata?.actionMethods ?? {
                [contextOrMethodName.name]: {
                    GET: null,
                    DELETE: null,
                    PATCH: null,
                    POST: null,
                    PUT: null
                } as RouteMetadata
            }) as Record<string, RouteMetadata>;

            const key = contextOrMethodName.name as keyof typeof metadata;

            metadata[key] ??= {
                GET: null,
                DELETE: null,
                PATCH: null,
                POST: null,
                PUT: null
            } as RouteMetadata;

            const data = {
                handler: originalMethodOrTarget as AnyFunction,
                method,
                path: uri,
                middleware: middleware as AnyFunction[]
            };

            metadata[key][method] ??= data;
            metadata[key][method].handler ??= data.handler;
            metadata[key][method].method ??= data.method;

            if (metadata[key][method].middleware?.length) {
                metadata[key][method].middleware.push(...data.middleware);
            } else {
                metadata[key][method].middleware = data.middleware;
            }

            (contextOrMethodName.metadata as unknown) ??= {};
            contextOrMethodName.metadata.actionMethods = metadata;
            return originalMethodOrTarget as void;
        }
    };
}
