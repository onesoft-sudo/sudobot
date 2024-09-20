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

import type { AnyConstructor } from "./Container";

export function Inject<R extends AnyConstructor>(ref?: R | string) {
    return (target: object, key: string | symbol, _descriptor?: PropertyDescriptor) => {
        const injections =
            (Reflect.getMetadata("di:inject", target) as {
                key: string | symbol;
                name: string | null;
                ref: R | null | undefined;
            }[]) || [];

        injections.push({
            key,
            ref: typeof ref === "string" ? null : ref,
            name: typeof ref === "string" ? ref : null
        });

        Reflect.defineMetadata("di:inject", injections, target);
    };
}
