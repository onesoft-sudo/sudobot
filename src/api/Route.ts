import { Request, Response as ExpressResponse } from "express";
import Response from "./Response";

export default class Route {
    constructor(public readonly method: string, public readonly path: string, public readonly callback: [Object, string], public middlewareList: Array<any> = []) {

    }

    middleware(...middleware: Object[]) {
        this.middlewareList = [...this.middlewareList, ...middleware];
        return this;
    }

    async getCallbackFunction(...args: any[]) {
        const [controller, method] = this.callback;
        return async (req: Request, res: ExpressResponse) => {
            let output = (controller as { [key: string]: Function })[method].call(controller, req, res, ...args);

            if (output instanceof Promise) {
                output = await output;
            }

            if (output instanceof Response) {
                res.status(output.status);

                for (const header in output.headers) {
                    res.setHeader(header, output.headers[header]);
                }

                if (typeof output.body === 'object') {
                    res.json(output.body);
                }
                else {
                    res.send(output.body);
                }
            }
            else {
                if (typeof output === 'object') {
                    return res.json(output);
                }
    
                return res.send(output);
            }
        };
    }
}