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

import { ConfigurationManagerServiceInterface } from "@framework/contracts/ConfigurationManagerServiceInterface";
import cors from "cors";
import express, {
    Application,
    Request as ExpressRequest,
    Response as ExpressResponse,
    NextFunction
} from "express";
import ratelimiter from "express-rate-limit";
import { Router } from "express-serve-static-core";
import { Server as HttpServer } from "http";
import path from "path";
import { Logger } from "../log/Logger";
import { Name } from "../services/Name";
import { Service } from "../services/Service";
import { RouteMetadata } from "./RouteMetadata";
import Controller from "./http/Controller";
import Response from "./http/Response";

@Name("apiServer")
export default class APIServer extends Service {
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
    protected override readonly logger = new Logger("server", true);

    private _controllerDirectory = path.resolve(
        __dirname,
        "../../../main/typescript/api/controllers"
    );

    public setControllerDirectory(directory: string) {
        this._controllerDirectory = directory;
    }

    public async onReady() {
        if (
            (this.application.service("configManager") as ConfigurationManagerServiceInterface)
                .systemConfig.api.enabled
        ) {
            await this.setup();
            this.start();
        }
    }

    public async setup() {
        this.expressApp.use(this.onError);
        this.expressApp.use(cors());

        const configManager = this.application.service(
            "configManager"
        ) as ConfigurationManagerServiceInterface;

        if (configManager.systemConfig.trust_proxies !== undefined) {
            this.application.logger.info(
                "Set express trust proxy option value to ",
                configManager.systemConfig.trust_proxies
            );

            this.expressApp.set("trust proxy", configManager.systemConfig.trust_proxies);
        }

        this.expressApp.use(this.rateLimiter);

        this.expressApp.use("*", (req, res, next) => {
            this.logger.info(`${req.method.toUpperCase()} ${req.path} -- from ${req.ip}`);
            next();
        });

        this.expressApp.use(express.json());

        const router = await this.createRouter();
        this.expressApp.use("/", router);
    }

    private async createRouter() {
        const router = express.Router();
        await this.application.classLoader.loadControllers(router, this._controllerDirectory);
        return router;
    }

    private getMetadata<T>(
        controllerClass: typeof Controller,
        key: string,
        alternativeKey: string
    ): T | null {
        return (
            Symbol.metadata in controllerClass && controllerClass[Symbol.metadata]
                ? controllerClass[Symbol.metadata]?.[alternativeKey]
                : Reflect.getMetadata(key, controllerClass.prototype)
        ) as T | null;
    }

    public loadController(
        controller: Controller,
        controllerClass: typeof Controller,
        router: Router
    ) {
        const actions = this.getMetadata<Record<string, RouteMetadata>>(
            controllerClass,
            "action_methods",
            "actionMethods"
        );
        const aacMiddlewareList = this.getMetadata<Record<string, (...args: unknown[]) => unknown>>(
            controllerClass,
            "aac_middleware",
            "adminAccessControlMiddleware"
        );
        const gacMiddlewareList = this.getMetadata<Record<string, (...args: unknown[]) => unknown>>(
            controllerClass,
            "gac_middleware",
            "guildAccessControlMiddleware"
        );
        const requireAuthMiddlewareList = this.getMetadata<
            Record<string, (...args: unknown[]) => unknown>
        >(controllerClass, "auth_middleware", "authMiddleware");
        const validationMiddlewareList = this.getMetadata<
            Record<string, (...args: unknown[]) => unknown>
        >(controllerClass, "validation_middleware", "validationMiddleware");

        if (!actions) {
            return;
        }

        for (const callbackName in actions) {
            for (const method in actions[callbackName]) {
                const data =
                    actions[callbackName][method as keyof (typeof actions)[keyof typeof actions]];

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
                        m(this.application, request, response, next)
                );

                router[data.method.toLowerCase() as "head"].call(
                    router,
                    data.path,
                    ...(wrappedMiddleware as []),
                    <Application>this.wrapControllerAction(controller, callbackName)
                );

                this.application.logger.debug(
                    `Discovered API Route: ${data.method} ${data.path} -- in ${controllerClass.name}`
                );
            }
        }
    }

    private wrapControllerAction(controller: Controller, callbackName: string) {
        return async (request: ExpressRequest, response: ExpressResponse) => {
            const callback = controller[callbackName as keyof typeof controller] as (
                request: ExpressRequest,
                response: ExpressResponse
            ) => unknown;
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
                } else if (typeof controllerResponse !== "undefined") {
                    this.application.logger.warn(
                        "Invalid value was returned from the controller. Not sending a response."
                    );
                }
            }
        };
    }

    private onError(
        this: void,
        err: unknown,
        _: ExpressRequest,
        res: ExpressResponse,
        next: NextFunction
    ) {
        if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
            res.status(400).json({
                error: "Invalid JSON payload"
            });

            return;
        }

        next();
    }

    public start() {
        this.expressServer = this.expressApp.listen(this.port, () =>
            this.application.logger.info(`API server is listening at port ${this.port}`)
        );
    }
}
