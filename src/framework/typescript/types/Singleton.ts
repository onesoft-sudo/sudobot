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

import type { Awaitable } from "discord.js";
import Container from "../container/Container";

type ThisType = {
    instance: Singleton | null;
    createInstance(): Promise<Singleton>;
    new (): Singleton;
};

export class Singleton {
    private static instance: Singleton | null = null;

    public static async getInstance<T = Singleton>(): Promise<T> {
        const self = this as unknown as ThisType;

        if (self.instance === null) {
            self.instance = await self.createInstance();
        }

        return self.instance as T;
    }

    protected static createInstance(): Awaitable<Singleton> {
        return new this() as Singleton;
    }
}

export class ContainerSingleton extends Singleton {
    protected static override createInstance(): Awaitable<ContainerSingleton> {
        return Container.getInstance().resolveByClass(this) as ContainerSingleton;
    }
}
