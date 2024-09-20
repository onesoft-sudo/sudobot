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

import type { Awaitable, User } from "discord.js";
import type { OptionalRecord } from "../types/OptionalRecord";
import { ContainerSingleton } from "../types/Singleton";

declare global {
    interface PolicyActions {
        "": [];
    }
}

export type Action = keyof PolicyActions;

interface PolicyLike {
    new (): Policy;
    [method: `can${string}`]: ((action: Action, user: User) => Awaitable<boolean>) | undefined;
}

class Policy extends ContainerSingleton {
    protected static readonly methods: OptionalRecord<keyof PolicyActions, string | undefined> = {};

    public static async can<K extends Exclude<keyof PolicyActions, number>>(
        action: K,
        user: User,
        ...args: PolicyActions[K]
    ): Promise<boolean> {
        const methodName =
            this.methods[action] ?? `can${action[0].toUpperCase()}${action.slice(1)}`;
        const instance = this.getInstance() as unknown as PolicyLike & Policy;

        if (methodName in instance) {
            const method = instance[
                methodName as keyof typeof instance
            ] as PolicyLike[keyof PolicyLike];
            return !!(await method?.call(instance, action, user, ...(args as [])));
        }

        return false;
    }

    public boot?(): Awaitable<void>;

    protected static override async createInstance(this: new () => Policy): Promise<Policy> {
        const instance = (await super.createInstance()) as Policy;
        await instance.boot?.();
        return instance;
    }
}

export { Policy };
