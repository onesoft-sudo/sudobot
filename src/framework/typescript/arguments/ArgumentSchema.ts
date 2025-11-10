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

import type { OptionalRecord } from "@framework/types/OptionalRecord";
import type Argument from "./Argument";

export type ArgumentRuleData<T> =
    | T
    | {
          value: T;
          errorMessage?: string;
      };

export type ArgumentRules = {
    "range:min"?: ArgumentRuleData<number>;
    "range:max"?: ArgumentRuleData<number>;
} & OptionalRecord<string, ArgumentRuleData<unknown>>;

export type ArgumentDefinition<T extends typeof Argument<unknown> = typeof Argument<unknown>> = {
    type: T | T[];
    name: string;
    isOptional?: boolean;
    interactionName?: string;
    defaultIndex?: number;
    rules?: ArgumentRules | ArgumentRules[];
    errorMessages?: Record<keyof ArgumentRules, string>;
};

export type OptionDefinition = {
    short?: string;
    multiple?: boolean;
    argument?: boolean;
};

export type ArgumentOverload = {
    definitions: ArgumentDefinition[];
    options?: Record<string, OptionDefinition>;
};

export type ArgumentSchema = {
    overloads: ArgumentOverload[];
    defaultIndex?: number;
};
