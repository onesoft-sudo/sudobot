import { Response as ExpressResponse } from 'express';

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
        this.body = body ?? '';
        this.headers = headers ?? {};
    }

    send(response: ExpressResponse) {
        const tmp = response.status(this.status);

        for (const header in this.headers)
            tmp.header(header, this.headers[header].toString());

        tmp.send(this.body);
    }
}
