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

import type Controller from "../api/Controller";
import { RouteMetadata } from "../types/RouteMetadata";

export function Action(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", uri: string, middleware: Function[] = []) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        const metadata: Record<string, RouteMetadata> = Reflect.getMetadata("action_methods", target) ?? {
            [propertyKey]: {
                GET: null,
                DELETE: null,
                PATCH: null,
                POST: null,
                PUT: null
            } as RouteMetadata
        };

        metadata[propertyKey] ??= {
            GET: null,
            DELETE: null,
            PATCH: null,
            POST: null,
            PUT: null
        } as RouteMetadata;

        const data = { handler: descriptor.value, method, path: uri, middleware };

        metadata[propertyKey]![method] ??= data;
        metadata[propertyKey]![method]!.handler ??= data.handler;
        metadata[propertyKey]![method]!.method ??= data.method;

        if (metadata[propertyKey]![method]!.middleware?.length) {
            metadata[propertyKey]![method]!.middleware.push(...data.middleware);
        } else {
            metadata[propertyKey]![method]!.middleware = data.middleware;
        }

        Reflect.defineMetadata("action_methods", metadata, target);
    };
}
