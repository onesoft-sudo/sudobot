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

import type LiteralNode from "./LiteralNode";
import Node from "./Node";
import type { Range } from "../PolicyModuleParserTypes";

class ModuleBlockPropertyNode extends Node {
    public readonly identifier: string;
    public readonly value: LiteralNode;

    public constructor(identifier: string, value: LiteralNode, range: Range) {
        super(range);
        this.identifier = identifier;
        this.value = value;
    }

    public override branches(): Node[] {
        return [this.value];
    }
}

export default ModuleBlockPropertyNode;
