// FIXME: Using Client here is a bit of a hack, but it works for now.

import Client from "../../core/Client";

export abstract class HasClient {
    public constructor(protected readonly client: Client) {}
}
