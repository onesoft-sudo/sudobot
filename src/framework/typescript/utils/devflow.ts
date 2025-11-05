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

import Application from "@framework/app/Application";

export class NotImplementedError extends Error {}

export const TODO: ((what?: string) => never) & { Method: (what?: string) => MethodDecorator } = (
    what: string = "Not implemented"
) => {
    throw new NotImplementedError(what);
};

TODO.Method = (what: string = "Not implemented") => {
    return (_target, _methodName, context) => {
        context.value = (() => TODO(what)) as typeof context.value;
    };
};

export const BUG = (...args: unknown[]) => {
    Application.current().logger.bug(...args);
    console.trace();
    Application.current().logger.fatal("The best thing we can do is to gracefully exit.");
    process.exit(1);
};
