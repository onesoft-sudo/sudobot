import { Request, Response } from "express";

export default class Route {
    constructor(public readonly method: string, public readonly path: string, public readonly callback: [Object, string], public middlewareList: Array<any> = []) {

    }

    middleware(...middleware: Object[]) {
        this.middlewareList = [...this.middlewareList, ...middleware];
    }

    getCallbackFunction(...args: any[]) {
        const [controller, method] = this.callback;
        return (req: Request, res: Response) => {
            const output = (controller as { [key: string]: Function })[method].call(controller, req, res, ...args);

            if (typeof output === 'object') {
                return res.json(output);
            }

            return res.send(output);
        };
    }
}