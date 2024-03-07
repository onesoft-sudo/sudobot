/**
* This file is part of SudoBot.
* 
* Copyright (C) 2021-2023 OSN Developers.
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

import { Response as ExpressResponse } from "express";

export interface CreateResponseOptions {
    status?: number;
    body?: any;
    headers?: Record<string, string | number>;
}

export default class Response {
    status: number;
    body: any;
    headers: Record<string, string | number>;

    constructor({ status, body, headers }: CreateResponseOptions) {
        this.status = status ?? 200;
        this.body = body ?? "";
        this.headers = headers ?? {};
    }

    send(response: ExpressResponse) {
        const tmp = response.status(this.status);

        for (const header in this.headers)
            tmp.header(header, this.headers[header].toString());

        tmp.send(this.body);
    }
}
