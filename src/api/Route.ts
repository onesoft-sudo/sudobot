
/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2022 OSN Inc.
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

import { Request, Response as ExpressResponse } from "express";
import Controller from "./Controller";
import Response from "./Response";

export default class Route {
    constructor(public readonly method: string, public readonly path: string, public readonly callback: [Controller, string], public middlewareList: Array<Function> = []) {
        this.middlewareList = [...this.middlewareList, ...callback[0].globalMiddleware()];
    }

    middleware(...middleware: Function[]) {
        this.middlewareList = [...this.middlewareList, ...middleware];
        return this;
    }

    async getCallbackFunction(...args: any[]) {
        const [controller, method] = this.callback;
        return async (req: Request, res: ExpressResponse) => {
            let output = ((controller)[method as keyof typeof controller] as any).call(controller, req, res, ...args);

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