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

import type DirectiveParser from "@framework/directives/DirectiveParser";
import type { Awaitable } from "discord.js";

export type ParserState = {
    output: string;
    input: string;
    data: Record<string, unknown>;
    currentArgument: string | undefined;
};

abstract class Directive<T = unknown> {
    public abstract readonly name: string;

    public abstract apply(parser: DirectiveParser, parserState: ParserState, arg: T): Awaitable<void>;
}

export default Directive;
