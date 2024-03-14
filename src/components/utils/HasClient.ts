import Client from "../../core/Client";
import BaseClient from "../client/BaseClient";

// FIXME: Using Client here is a bit of a hack, but it works for now.
export abstract class HasClient<C extends BaseClient = Client> {
    public constructor(protected readonly client: C) {}
}
