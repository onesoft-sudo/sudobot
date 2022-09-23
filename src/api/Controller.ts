import DiscordClient from "../client/Client";
import KeyValuePair from "../types/KeyValuePair";
import Response from "./Response";

export default class Controller {
    constructor(protected client: DiscordClient) {
        console.log("Constructor call");
    }

    protected response(body: string | object | null | undefined, status: number = 200, headers: KeyValuePair<string> = {}) {
        return new Response(status, body, headers);
    }

    globalMiddleware(): Function[] {
        return [];
    }

    middleware(): KeyValuePair<Function[]> {
        return {};
    }
}