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

import type Command from "@framework/commands/Command";
import type Argument from "./Argument";

export type ArgumentTypes<D extends readonly { name: string; type: object }[]> = {
    [K in D[number] as K["name"]]: K["type"] extends typeof Argument<infer T> ? T : never;
};

export type ArgumentsOf<T extends Command> = NonNullable<T["argumentSchema"]>["overloads"][number] extends {
    definitions: infer D;
}
    ? D extends readonly { name: string; type: object }[]
        ? ArgumentTypes<D>
        : never
    : never;
