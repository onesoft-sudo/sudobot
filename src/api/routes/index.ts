import { Request, Response } from "express";
import { Route } from "../Router";

export default <Route> {
    path: '/',
    all(req: Request, res: Response) {
        res.send('API is up.');
    }
};