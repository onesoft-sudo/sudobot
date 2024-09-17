/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024 OSN Developers.
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

import type { Snowflake } from "discord.js";
import { Collection } from "discord.js";
import type { ReadonlyCollection } from "../collections/ReadonlyCollection";
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

    protected get mutableCache(): Collection<`${Snowflake}:${I}`, T> {
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

    public delete(guildId: Snowflake, key: I): boolean {
        this._metadata.delete(`${guildId}:${key}`);
        return this._cache.delete(`${guildId}:${key}`);
    }

    public getMetadata(guildId: Snowflake, key: I): Metadata | undefined {
        return this._metadata.get(`${guildId}:${key}`);
    }
}

export default GuildStore;
