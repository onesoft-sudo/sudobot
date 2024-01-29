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
import ratelimiter from "express-rate-limit";
import { Router } from "express-serve-static-core";
import { Server as HttpServer } from "http";
import Client from "../core/Client";
import { RouteMetadata, RouteMetadataEntry } from "../types/RouteMetadata";
import { log, logInfo, logWarn } from "../utils/logger";
import Controller from "./Controller";
import Response from "./Response";

// FIXME: Support new decorators
export default class Server {
    protected readonly expressApp = express();
    protected readonly rateLimiter = ratelimiter({
        windowMs: 30 * 1000,
        max: 28,
        standardHeaders: true,
        legacyHeaders: false
    });
    protected readonly configRateLimiter = ratelimiter({
        windowMs: 10 * 1000,
        max: 7,
        standardHeaders: true,
        legacyHeaders: false
    });
    public readonly port = process.env.PORT ?? 4000;
    public expressServer?: HttpServer;

    constructor(protected readonly client: Client) {}

    async onReady() {
        if (this.client.configManager.systemConfig.api.enabled) {
            await this.boot();
        }
    }

    async boot() {
        this.expressApp.use(this.onError);
        this.expressApp.use(cors());

        if (this.client.configManager.systemConfig.trust_proxies !== undefined) {
            logInfo("Set express trust proxy option value to ", this.client.configManager.systemConfig.trust_proxies);
            this.expressApp.set("trust proxy", this.client.configManager.systemConfig.trust_proxies);
        }

        this.expressApp.use(this.rateLimiter);
        this.expressApp.use("/config", this.configRateLimiter);
        this.expressApp.use(express.json());

        const router = await this.createRouter();
        this.expressApp.use("/", router);
    }

    async createRouter() {
        const router = express.Router();
        await this.client.dynamicLoader.loadControllers(router);
        return router;
    }

    loadController(controller: Controller, controllerClass: typeof Controller, router: Router) {
        const actions = (
            Symbol.metadata in controllerClass && controllerClass[Symbol.metadata]
                ? controllerClass[Symbol.metadata]?.actionMethods
                : Reflect.getMetadata("action_methods", controllerClass.prototype)
        ) as Record<string, RouteMetadata> | null;
        const aacMiddlewareList = (
            Symbol.metadata in controllerClass && controllerClass[Symbol.metadata]
                ? controllerClass[Symbol.metadata]?.adminAccessControlMiddleware
                : Reflect.getMetadata("aac_middleware", controllerClass.prototype)
        ) as Record<string, Function> | null;
        const gacMiddlewareList = (
            Symbol.metadata in controllerClass && controllerClass[Symbol.metadata]
                ? controllerClass[Symbol.metadata]?.guildAccessControlMiddleware
                : Reflect.getMetadata("gac_middleware", controllerClass.prototype)
        ) as Record<string, Function> | null;
        const requireAuthMiddlewareList = (
            Symbol.metadata in controllerClass && controllerClass[Symbol.metadata]
                ? controllerClass[Symbol.metadata]?.authMiddleware
                : Reflect.getMetadata("auth_middleware", controllerClass.prototype)
        ) as Record<string, Function> | null;
        const validationMiddlewareList = (
            Symbol.metadata in controllerClass && controllerClass[Symbol.metadata]
                ? controllerClass[Symbol.metadata]?.validationMiddleware
                : Reflect.getMetadata("validation_middleware", controllerClass.prototype)
        ) as Record<string, Function> | null;

        if (!actions) {
            return;
        }

        for (const callbackName in actions) {
            for (const method in actions[callbackName]) {
                const data = actions[callbackName][
                    method as keyof (typeof actions)[keyof typeof actions]
                ] as RouteMetadataEntry | null;

                if (!data) {
                    continue;
                }

                const middleware = [];

                if (requireAuthMiddlewareList?.[callbackName]) {
                    middleware.push(requireAuthMiddlewareList?.[callbackName]);
                }

                if (aacMiddlewareList?.[callbackName]) {
                    middleware.push(aacMiddlewareList?.[callbackName]);
                }

                if (gacMiddlewareList?.[callbackName]) {
                    middleware.push(gacMiddlewareList?.[callbackName]);
                }

                if (validationMiddlewareList?.[callbackName]) {
                    middleware.push(validationMiddlewareList?.[callbackName]);
                }

                middleware.push(...(data.middleware ?? []));

                const wrappedMiddleware = middleware.map(
                    m => (request: ExpressRequest, response: ExpressResponse, next: NextFunction) =>
                        m(this.client, request, response, next)
                );

                router[data.method.toLowerCase() as "head"].call(
                    router,
                    data.path,
                    ...(wrappedMiddleware as []),
                    <any>this.wrapControllerAction(controller, callbackName)
                );

                log(`Discovered API Route: ${data.method} ${data.path} -- in ${controllerClass.name}`);
            }
        }
    }

    wrapControllerAction(controller: Controller, callbackName: string) {
        return async (request: ExpressRequest, response: ExpressResponse) => {
            const callback = controller[callbackName as keyof typeof controller] as Function;
            const controllerResponse = await callback.call(controller, request, response);

            if (!response.headersSent) {
                if (controllerResponse instanceof Response) {
                    controllerResponse.send(response);
                } else if (controllerResponse && typeof controllerResponse === "object") {
                    response.json(controllerResponse);
                } else if (typeof controllerResponse === "string") {
                    response.send(controllerResponse);
                } else if (typeof controllerResponse === "number") {
                    response.send(controllerResponse.toString());
                } else {
                    logWarn("Invalid value was returned from the controller. Not sending a response.");
                }
            }
        };
    }

    onError(err: unknown, req: ExpressRequest, res: ExpressResponse, next: NextFunction) {
        if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
            res.status(400).json({
                error: "Invalid JSON payload"
            });

            return;
        }
    }

    async start() {
        this.expressServer = this.expressApp.listen(this.port, () => logInfo(`API server is listening at port ${this.port}`));
    }
}
