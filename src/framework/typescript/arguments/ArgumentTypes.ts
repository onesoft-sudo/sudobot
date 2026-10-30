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

import type { ArgumentSchema, OptionDefinition } from "@framework/arguments/ArgumentSchema.js";

export type ArgumentTypes<
    D extends readonly {
        readonly name: string;
        readonly type: object;
        readonly isOptional?: boolean | null | undefined;
    }[]
> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [K in D[number] as K["name"]]: K["type"] extends new (...args: any[]) => any
        ? InstanceType<K["type"]> extends { readonly _type: infer T }
            ? T | (K["isOptional"] extends true ? null : never)
            : never
        : never;
};

export type ArgumentsOf<T extends { argumentSchema: ArgumentSchema }> = NonNullable<
    T["argumentSchema"]
>["overloads"][number] extends {
    definitions: infer D;
}
    ? D extends readonly {
          readonly name: string;
          readonly type: object;
          readonly isOptional?: boolean | null | undefined;
      }[]
        ? ArgumentTypes<D>
        : never
    : never;

export type OptionsOf<T extends { argumentSchema: ArgumentSchema }> = NonNullable<
    T["argumentSchema"]
>["overloads"][number] extends {
    options: infer O;
}
    ? O extends Record<string, OptionDefinition>
        ? {
              [K in keyof O]: O[K]["multiple"] extends true
                  ? ReadonlyArray<O[K]["argument"] extends true ? string | null : "yes" | null>
                  : O[K]["argument"] extends true
                    ? string | null
                    : "yes" | null;
          }
        : never
    : never;
