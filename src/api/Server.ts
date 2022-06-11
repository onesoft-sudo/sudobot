import DiscordClient from "../client/Client";
import express, { Application, Request, Response } from 'express';
import routes from './routes';
import router from "./Router";
import pubRouter from "./PublicRouter";
import { readFileSync } from "fs";
import path from "path";

export default class Server {
    app: Application;
    port: number = 4000;
    guildData: {
        [key: string]: {
            token: string;
        }
    };

    constructor(protected client: DiscordClient) {
        this.app = express();
        const data: typeof this.guildData = {};

        for (const key of Object.keys(process.env)) {
            if (key.startsWith('TOKEN_')) {
                data[key.replace(/^TOKEN_/g, '')] = {
                    token: process.env[key]!
                };
            }
        }

        this.guildData = data;
        console.log(data);        
    }

    verifyToken(guild: string, token: string): boolean {
        return this.guildData[guild] && this.guildData[guild].token === token;
    }

    validToken(token: string): boolean {
        for (const key in this.guildData) {
            if (this.guildData[key].token === token)
                return true;
        }

        return false;
    }

    registerRoutes() {
        this.app.all('/', (req: Request, res: Response) => {
            res.send("Server is up.");
        });

        this.app.use('/pub', pubRouter);        
        this.app.use('/api', router);
    }

    run(port: number = 4000) {
        this.port = port;

        this.registerRoutes();
        this.app.listen(port, () => console.log('Server listening at port ' + this.port));
    }
}