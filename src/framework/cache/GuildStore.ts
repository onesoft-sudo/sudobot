import { Collection, Snowflake } from "discord.js";
import { ReadonlyCollection } from "../collections/ReadonlyCollection";
import { application } from "../utils/helpers";

export type Metadata = {
    timestamp: number;
};

abstract class GuildStore<I extends string | number | bigint | boolean | null | undefined, T> {
    private readonly _cache = new Collection<`${Snowflake}:${I}`, T>();
    private readonly _metadata = new Collection<`${Snowflake}:${I}`, Metadata>();
    private _timeout?: Timer;
    protected abstract readonly ttl: number;

    public get cache(): ReadonlyCollection<`${Snowflake}:${I}`, T> {
        return this._cache;
    }

    public setInterval() {
        this._timeout = setInterval(() => {
            this.sweep();
        }, this.ttl);
    }

    public clearInterval() {
        if (this._timeout) {
            clearInterval(this._timeout);
        }
    }

    public sweep(): void {
        const now = Date.now();
        const removedCount = this._cache.sweep((_, key) => {
            const metadata = this._metadata.get(key);
            return metadata ? now - metadata.timestamp > this.ttl : true;
        });

        application().logger.debug(`Sweeped ${removedCount} items from ${this.constructor.name}`);
    }

    public get(guildId: Snowflake, key: I): T | undefined {
        return this._cache.get(`${guildId}:${key}`);
    }

    public set(guildId: Snowflake, key: I, value: T): this {
        this._cache.set(`${guildId}:${key}`, value);
        this._metadata.set(`${guildId}:${key}`, { timestamp: Date.now() });
        return this;
    }
}

export default GuildStore;
