import DiscordClient from "../client/Client";
import Service from "../utils/structures/Service";
import express, { Express } from 'express';
import Router from "./Router";
import path from "path";

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
        await this.router.loadRoutes();
    }

    async run() {
        await this.boot();
        
        this.express.listen(this.port, () => {
            console.log(`API Server listening at port ${this.port}`);
        });
    }
}