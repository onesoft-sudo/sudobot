import express, { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { lstatSync, readdir } from "fs";
import path from "path";
import DiscordClient from "../client/Client";
import auth from "./Auth";
import apiRoute from "./routes";

const router = Router();

router.use(express.json());
router.use(express.urlencoded({
    extended: false
}));
router.use(auth);
router.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', DiscordClient.client.config.props.global.cp_host);
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Access-Control-Allow-Origin, Access-Control-Allow-Methods, Content-Type, Content-Length');
    next();
});

export interface Route {
    path: string;
    middleware: RequestHandler[];
    get?: (req: Request, res: Response) => any,
    post?: (req: Request, res: Response) => any,
    put?: (req: Request, res: Response) => any,
    patch?: (req: Request, res: Response) => any,
    delete?: (req: Request, res: Response) => any,
    all?: (req: Request, res: Response) => any,
};

export function loadRoutes(dir: string = __dirname, router: Router) {
    readdir(dir, async (err, data) => {
        if (err) {
            console.log(err);
            return;
        }

        for await (const file of data) {
            if (file === '.' || file === '..')
                continue;

            let filePath = await path.resolve(dir, file);
            
            if (lstatSync(filePath).isDirectory())
                continue;

            let route = <Route> (await import(filePath)).default;
            let middleware = route.middleware ?? [];

            if (route.get) {
                router.get(route.path, ...middleware, route.get);
            }

            if (route.post) {
                router.post(route.path, ...middleware, route.post);
            }

            if (route.put) {
                router.put(route.path, ...middleware, route.put);
            }

            if (route.patch) {
                router.patch(route.path, ...middleware, route.patch);
            }
            
            if (route.delete) {
                router.delete(route.path, ...middleware, route.delete);
            }
            
            if (route.all) {
                router.all(route.path, ...middleware, route.all);
            }
        }
    });
}

loadRoutes(path.resolve(__dirname, 'routes'), router);

export default router;