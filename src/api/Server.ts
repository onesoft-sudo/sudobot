/**
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

import express, { Request as ExpressRequest, Response as ExpressResponse } from "express";
import fs from "fs/promises";
import { join, resolve } from "path";
import Client from "../core/Client";
import Controller from "./Controller";
import Response from "./Response";

export type ControllerFunction = ((request: ExpressRequest) => any) & {
    __controller_path?: string;
    __controller_method?: string;
    __controller_middleware?: Function[];
};

export function Path(uri: string) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        (target as any).handlerMethods ??= new Set();
        (target as any).handlerMethods.add(propertyKey);

        Object.defineProperty(target[propertyKey as keyof Controller], "__controller_path", {
            writable: false,
            value: uri,
        });

        console.log("Found controller function: ", propertyKey);
    };
}

export function Method(methodName: string) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        (target as any).handlerMethods ??= new Set();
        (target as any).handlerMethods.add(propertyKey);

        Object.defineProperty(target[propertyKey as keyof Controller], "__controller_method", {
            writable: false,
            value: methodName,
        });
    };
}

export function Middleware(middleware: Function[]) {
    return (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) => {
        (target as any).handlerMethods ??= new Set();
        (target as any).handlerMethods.add(propertyKey);

        Object.defineProperty(target[propertyKey as keyof Controller], "__controller_middleware", {
            writable: false,
            value: middleware,
        });
    };
}

export default class Server {
    protected expressApp = express();
    protected port = process.env.PORT ?? 4000;
    protected controllersDirectory = resolve(__dirname, "controllers");

    constructor(protected client: Client) {
        this.boot();
    }

    async boot() {
        const router = express.Router();
        await this.loadControllers(undefined, router);
        this.expressApp.use("/", router);
    }

    async loadControllers(directory = this.controllersDirectory, router: express.Router) {
        const files = await fs.readdir(directory);

        for (const file of files) {
            const filePath = join(directory, file);
            const isDirectory = (await fs.lstat(filePath)).isDirectory();

            if (isDirectory) {
                await this.loadControllers(filePath, router);
                continue;
            }

            if (!file.endsWith(".ts") && !file.endsWith(".js")) {
                continue;
            }

            const { default: ControllerClass } = await import(filePath);
            const controller: Controller = new ControllerClass(this.client);

            console.log((controller as any).handlerMethods);

            for (const methodName of ((controller as any).handlerMethods as Set<string>).values()) {
                const controllerFunction = controller[methodName as keyof Controller] as unknown as ControllerFunction;

                if (typeof controllerFunction !== "function") {
                    console.log(`[Server] Not a function (${methodName}), ignoring.`);
                    continue;
                }

                const { __controller_path: path, __controller_method: method, __controller_middleware: middleware } = controllerFunction;

                if (!path) {
                    console.error(`[Server] No path specified at function ${methodName} in controller ${file}. Skipping.`);
                    continue;
                }

                if (method && !["get", "post", "head", "put", "patch", "delete"].includes(method)) {
                    console.error(`[Server] Invalid method '${method}' specified at function ${methodName} in controller ${file}. Skipping.`);
                    continue;
                }

                console.log(`Added handler for ${method?.toUpperCase() ?? "GET"} ${path}`);

                (router[(method ?? "get") as keyof typeof router] as Function)(
                    path,
                    ...(middleware ?? []),
                    async (req: ExpressRequest, res: ExpressResponse) => {
                        const userResponse = await controllerFunction.bind(controller)(req);

                        if (userResponse instanceof Response) {
                            userResponse.send(res);
                        } else if (userResponse && typeof userResponse === "object") {
                            res.json(userResponse);
                        } else if (typeof userResponse === "string") {
                            res.send(userResponse);
                        } else if (typeof userResponse === "number") {
                            res.send(userResponse.toString());
                        } else {
                            console.log("Invalid value returned from controller. Not sending a response.");
                        }
                    }
                );
            }
        }
    }

    async start() {
        this.expressApp.listen(this.port, () => console.log(`API server is listening at port ${this.port}`));
    }
}
