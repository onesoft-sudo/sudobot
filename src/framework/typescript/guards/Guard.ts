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
import type { Command } from "../commands/Command";
import type { ContextOf } from "../commands/Context";
import type { ContextType } from "../commands/ContextType";
import Container from "../container/Container";
import type { GuardLike } from "./GuardLike";

abstract class Guard implements GuardLike {
    private static instance: Guard | null = null;

    public static async getInstance(): Promise<Guard> {
        if (!this.instance) {
            this.instance = Container.getInstance().resolveByClass(
                this as unknown as new () => Guard
            );
            await this.instance.boot?.();
        }

        return this.instance;
    }

    public boot?(): Awaitable<void>;
    public abstract check<T extends Command<ContextType>>(
        command: T,
        context: ContextOf<T>
    ): Awaitable<boolean>;
}

export { Guard };
