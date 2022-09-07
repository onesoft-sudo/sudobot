import DiscordClient from "../client/Client";
import Service from "../utils/structures/Service";
import express, { Express, Router as ExpressRouter } from 'express';
import Router from "./Router";
import path from "path";
import rateLimit from 'express-rate-limit';

export interface ServerOptions {
    port?: number;
}

export default class Server extends Service {
    port: number;
    express: Express;
    router: Router;

    constructor(client: DiscordClient, { port = 4000 }: ServerOptions = {}) {
        super(client);
        this.port = port;
        this.express = express();
        this.router = new Router(client, this, { routesDir: path.resolve(__dirname, 'routes') });
    }

    async boot() {
        type methods = 'get' | 'post' | 'put' | 'patch' | 'delete';
        const expressRouter = ExpressRouter();

        expressRouter.use(rateLimit({
            windowMs: 1 * 60 * 1000,
            max: 50, 
            standardHeaders: true,
            legacyHeaders: true,
            message: { code: 429, error: 'Too many requests at a time. Please try again later.' },
        }));

        expressRouter.use(express.json());
        expressRouter.use(express.urlencoded({ extended: true }));

        await this.router.loadRoutes();

        for (const route of this.router.routes) {            
            console.log(route.callback[1], route.callback[0].middleware()[route.callback[1]]);            
            expressRouter[route.method.toLowerCase() as methods](route.path, ...(route.callback[0].middleware()[route.callback[1]] as any[] ?? []), ...route.middlewareList as any[], await route.getCallbackFunction());
        }

        this.express.use(expressRouter);
    }

    async run() {
        await this.boot();
        
        this.express.listen(this.port, () => {
            console.log(`API Server listening at port ${this.port}`);
        });
    }
}