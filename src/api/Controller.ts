import KeyValuePair from "../types/KeyValuePair";
import Response from "./Response";

export default class Controller {
    constructor() {
        console.log("Constructor call");
    }

    protected response(body: string, status: number = 200, headers: KeyValuePair<string> = {}) {
        return new Response(status, body, headers);
    }

    globalMiddleware(): Function[] {
        return [];
    }

    middleware(): KeyValuePair<Function[]> {
        return {};
    }
}