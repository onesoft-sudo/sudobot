/*
 * This file is part of SudoBot.
 *
 * Copyright (C) 2021, 2022, 2023, 2024, 2025 OSN Developers.
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

import type Application from "@framework/app/Application";
import type Command from "@framework/commands/Command";
import type Context from "@framework/commands/Context";
import Singleton from "@framework/objects/Singleton";
import type { Awaitable } from "discord.js";
import { GuardStatusCode } from "./GuardStatusCode";
import type { GuardResolvable } from "./GuardResolvable";

abstract class Guard<in T extends Command = Command> extends Singleton {
    protected readonly application: Application;

    public constructor(application: Application) {
        super();
        this.application = application;
    }

    /**
     * Perform necessary checks.
     *
     * @param command The command for which this guard will perform checks.
     * @returns {boolean} Whether the check succeeded.
     * @throws {PermissionDeniedError} If missing permissions.
     */
    protected abstract check(command: T, context: Context): Awaitable<GuardStatusCode>;

    public async run(command: T, context: Context): Promise<GuardStatusCode> {
        const code = await this.check(command, context);
        return code;
    }

    public static async runGuards<T extends Command>(
        command: T,
        context: Context,
        guards: Iterable<GuardResolvable<T>>
    ) {
        for (const guard of guards) {
            const instance = typeof guard === "function" ? new guard(context.application) : guard;
            const code = await instance.run(command, context);

            switch (code) {
                case GuardStatusCode.Success:
                    continue;

                case GuardStatusCode.Failure:
                    return guard;

                case GuardStatusCode.Bail:
                    break;
            }
        }

        return null;
    }
}

export default Guard;
