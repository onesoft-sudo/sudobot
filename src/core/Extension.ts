import Client from "./Client";

export abstract class Extension {
    public readonly name?: string;

    constructor(protected readonly client: Client) {}

    async commands(): Promise<string[] | null> {
        return null;
    }

    async events(): Promise<string[] | null> {
        return null;
    }
}
