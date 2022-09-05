import KeyValuePair from "../types/KeyValuePair";

export default class Response {
    constructor(public readonly status: number, public readonly body: string | object | null | undefined = '', public readonly headers: KeyValuePair<string> = {}) {
        
    }

    toString() {
        return this.body;
    }
}