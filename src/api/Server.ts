import DiscordClient from "../client/Client";
import express, { Application, Request, Response } from 'express';
import routes from './routes';
import router from "./Router";
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
        this.guildData = JSON.parse(readFileSync(path.resolve(__dirname, '..', '..', 'config', 'apiguilds.json')).toString());
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

        this.app.use('/api', router);
    }

    run(port: number = 4000) {
        this.port = port;

        this.registerRoutes();
        this.app.listen(port, () => console.log('Server listening at port ' + this.port));
    }
}