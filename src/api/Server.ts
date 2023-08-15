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

import cors from "cors";
import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import fs from "fs/promises";
import { Server as HttpServer } from "http";
import { join, resolve } from "path";
import Client from "../core/Client";
import { RouteMetadata } from "../types/RouteMetadata";
import { log, logError, logInfo, logWarn } from "../utils/logger";
import Controller from "./Controller";
import Response from "./Response";

export default class Server {
    protected expressApp = express();
    public readonly port = process.env.PORT ?? 4000;
    protected controllersDirectory = resolve(__dirname, "controllers");
    expressServer?: HttpServer;

    constructor(protected client: Client) {}

    async onReady() {
        await this.boot();
    }

    async boot() {
        const router = express.Router();
        await this.loadControllers(undefined, router);

        this.expressApp.use((err: unknown, req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
            if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
                res.status(400).json({
                    error: "Invalid JSON payload"
                });

                return;
            }
        });

        this.expressApp.use(cors());

        const limiter = rateLimit({
            windowMs: 30 * 1000,
            max: 28,
            standardHeaders: true,
            legacyHeaders: false
        });

        const configLimiter = rateLimit({
            windowMs: 10 * 1000,
            max: 7,
            standardHeaders: true,
            legacyHeaders: false
        });

        if (this.client.configManager.systemConfig.trust_proxies !== undefined) {
            logInfo("Set express trust proxy option value to ", this.client.configManager.systemConfig.trust_proxies);
            this.expressApp.set("trust proxy", this.client.configManager.systemConfig.trust_proxies);
        }

        this.expressApp.use(limiter);
        this.expressApp.use("/config", configLimiter);
        this.expressApp.use(express.json());
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

            const metadata: Record<string, RouteMetadata> | undefined = Reflect.getMetadata(
                "action_methods",
                ControllerClass.prototype
            );

            const authMiddleware = Reflect.getMetadata("auth_middleware", ControllerClass.prototype) ?? {};
            const validatonMiddleware = Reflect.getMetadata("validation_middleware", ControllerClass.prototype) ?? {};

            if (metadata) {
                for (const methodName in metadata) {
                    if (!metadata[methodName]) {
                        continue;
                    }

                    for (const method in metadata[methodName]!) {
                        const data = metadata[methodName][method as keyof RouteMetadata]!;

                        if (!data) {
                            continue;
                        }

                        const { middleware, handler, path } = data;

                        if (!handler) {
                            continue;
                        }

                        if (!path) {
                            logError(`[Server] No path specified at function ${handler.name} in controller ${file}. Skipping.`);
                            continue;
                        }

                        if (method && !["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"].includes(method)) {
                            logError(
                                `[Server] Invalid method '${method}' specified at function ${handler.name} in controller ${file}. Skipping.`
                            );
                            continue;
                        }

                        log(`Added handler for ${method?.toUpperCase() ?? "GET"} ${path}`);

                        const finalMiddlewareArray = [
                            ...(authMiddleware[methodName] ? [authMiddleware[methodName]] : []),
                            ...(validatonMiddleware[methodName] ? [validatonMiddleware[methodName]] : []),
                            ...(middleware ?? [])
                        ];

                        (router[(method?.toLowerCase() ?? "get") as keyof typeof router] as Function)(
                            path,
                            ...(finalMiddlewareArray?.map(
                                fn => (req: ExpressRequest, res: ExpressResponse, next: NextFunction) =>
                                    fn(this.client, req, res, next)
                            ) ?? []),
                            async (req: ExpressRequest, res: ExpressResponse) => {
                                const userResponse = await handler.bind(controller)(req, res);

                                if (!res.headersSent) {
                                    if (userResponse instanceof Response) {
                                        userResponse.send(res);
                                    } else if (userResponse && typeof userResponse === "object") {
                                        res.json(userResponse);
                                    } else if (typeof userResponse === "string") {
                                        res.send(userResponse);
                                    } else if (typeof userResponse === "number") {
                                        res.send(userResponse.toString());
                                    } else {
                                        logWarn("Invalid value was returned from the controller. Not sending a response.");
                                    }
                                }
                            }
                        );
                    }
                }
            }
        }
    }

    async start() {
        this.expressServer = this.expressApp.listen(this.port, () => logInfo(`API server is listening at port ${this.port}`));
    }
}
