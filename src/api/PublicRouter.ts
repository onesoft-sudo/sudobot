import express, { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { lstatSync, readdir } from "fs";
import path from "path";
import DiscordClient from "../client/Client";
import auth from "./Auth";
import { loadRoutes } from "./Router";
import apiRoute from "./routes";

const router = Router();

router.use(express.json());
router.use(express.urlencoded({
    extended: false
}));

router.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', DiscordClient.client.config.props.global.cp_host);
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Access-Control-Allow-Origin, Access-Control-Allow-Methods, Content-Type, Content-Length');
    next();
});

loadRoutes(path.resolve(__dirname, 'public-routes'), router);

export default router;