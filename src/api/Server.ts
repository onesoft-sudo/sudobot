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
import rateLimit from "express-rate-limit";
import fs from "fs/promises";
import { join, resolve } from "path";
import Client from "../core/Client";
import { log, logError, logInfo, logWarn } from "../utils/logger";
import Controller from "./Controller";
import Response from "./Response";

export default class Server {
    protected expressApp = express();
    protected port = process.env.PORT ?? 4000;
    protected controllersDirectory = resolve(__dirname, "controllers");

    constructor(protected client: Client) {}

    async onReady() {
        await this.boot();
    }

    async boot() {
        const router = express.Router();
        await this.loadControllers(undefined, router);

        const limiter = rateLimit({
            windowMs: 30 * 1000,
            max: 28,
            standardHeaders: true,
            legacyHeaders: false
        });

        this.expressApp.use(limiter);
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

            const metadata:
                | Record<string, { handler: Function; method?: string; middleware?: Function[]; path?: string } | undefined>
                | undefined = Reflect.getMetadata("action_methods", ControllerClass.prototype);

            if (metadata) {
                for (const methodName in metadata) {
                    if (!metadata[methodName]) {
                        continue;
                    }

                    const { method, middleware, handler, path } = metadata[methodName]!;

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

                    (router[(method?.toLowerCase() ?? "get") as keyof typeof router] as Function)(
                        path,
                        ...(middleware ?? []),
                        async (req: ExpressRequest, res: ExpressResponse) => {
                            const userResponse = await handler.bind(controller)(req);

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
                    );
                }
            }
        }
    }

    async start() {
        this.expressApp.listen(this.port, () => logInfo(`API server is listening at port ${this.port}`));
    }
}
